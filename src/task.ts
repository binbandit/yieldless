export type TaskFactory<T> = (signal: AbortSignal) => PromiseLike<T> | T;

export interface TaskGroup {
  readonly signal: AbortSignal;
  spawn<T>(task: TaskFactory<T>): Promise<T>;
}

function createAbortReason(signal: AbortSignal): unknown {
  if ("reason" in signal) {
    return signal.reason;
  }

  return new Error("Task group aborted.");
}

function throwIfAborted(signal: AbortSignal): void {
  if (typeof signal.throwIfAborted === "function") {
    signal.throwIfAborted();
    return;
  }

  if (signal.aborted) {
    throw createAbortReason(signal);
  }
}

class TaskGroupController implements TaskGroup {
  readonly signal: AbortSignal;

  #controller: AbortController;
  #tasks: Set<Promise<unknown>>;
  #closed: boolean;
  #hasError: boolean;
  #error: unknown;

  constructor() {
    this.#controller = new AbortController();
    this.signal = this.#controller.signal;
    this.#tasks = new Set<Promise<unknown>>();
    this.#closed = false;
    this.#hasError = false;
    this.#error = undefined;
  }

  spawn<T>(task: TaskFactory<T>): Promise<T> {
    if (this.#closed) {
      return this.reject<T>(
        new Error("Cannot spawn a task after the task group has closed."),
      );
    }

    if (this.signal.aborted) {
      return this.reject<T>(createAbortReason(this.signal));
    }

    let running: Promise<T>;

    running = Promise.resolve()
      .then((): PromiseLike<T> | T => {
        throwIfAborted(this.signal);
        return task(this.signal);
      })
      .catch((error: unknown): never => {
        if (!this.#hasError) {
          this.abort(error);
        }

        throw error;
      })
      .finally((): void => {
        this.#tasks.delete(running);
      });

    this.#tasks.add(running);
    void running.catch((): void => undefined);

    return running;
  }

  abort(reason: unknown): void {
    if (!this.#hasError) {
      this.#hasError = true;
      this.#error = reason;
    }

    if (!this.signal.aborted) {
      this.#controller.abort(reason);
    }
  }

  close(): void {
    this.#closed = true;
  }

  async waitForChildren(): Promise<void> {
    while (this.#tasks.size > 0) {
      await Promise.allSettled(Array.from(this.#tasks));
    }
  }

  rethrowIfFailed(): void {
    if (this.#hasError) {
      throw this.#error;
    }
  }

  private reject<T>(reason: unknown): Promise<T> {
    const rejected: Promise<T> = Promise.reject(reason) as Promise<T>;
    void rejected.catch((): void => undefined);
    return rejected;
  }
}

/**
 * Runs a block of work with shared cancellation and sibling failure
 * propagation.
 *
 * Any task spawned through the group receives the same abort signal. The first
 * failure aborts the group, waits for every child to settle, then rethrows the
 * original error.
 */
export async function runTaskGroup<T>(
  operation: (group: TaskGroup, signal: AbortSignal) => PromiseLike<T> | T,
): Promise<T> {
  const group: TaskGroupController = new TaskGroupController();
  let didComplete: boolean = false;
  let result: T | undefined;

  try {
    result = await operation(group, group.signal);
    didComplete = true;
  } catch (error: unknown) {
    group.abort(error);
  } finally {
    group.close();
    await group.waitForChildren();
  }

  group.rethrowIfFailed();

  if (!didComplete) {
    throw new Error("Task group completed without producing a result.");
  }

  return result as T;
}
