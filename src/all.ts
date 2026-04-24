import type { SafeResult } from "yieldless/error";

export type SafeTask<T, E = Error> = (
  signal: AbortSignal,
) => PromiseLike<SafeResult<T, E>> | SafeResult<T, E>;

export interface ParallelOptions {
  readonly signal?: AbortSignal;
}

export interface MapLimitOptions extends ParallelOptions {
  readonly concurrency: number;
}

export type MapLimitMapper<Item, Value, ErrorType = Error> = (
  item: Item,
  index: number,
  signal: AbortSignal,
) => PromiseLike<SafeResult<Value, ErrorType>> | SafeResult<Value, ErrorType>;

type TaskValue<Task> = Task extends SafeTask<infer T, any> ? T : never;
type TaskError<Task> = Task extends SafeTask<any, infer E> ? E : never;

export type AllValues<Tasks extends readonly SafeTask<any, any>[]> = {
  -readonly [Index in keyof Tasks]: TaskValue<Tasks[Index]>;
};

export type ParallelError<Tasks extends readonly SafeTask<any, any>[]> =
  TaskError<Tasks[number]>;

function createAbortReason(signal: AbortSignal): unknown {
  if ("reason" in signal) {
    return signal.reason;
  }

  return new DOMException("This operation was aborted.", "AbortError");
}

function linkAbortSignal(
  signal: AbortSignal | undefined,
  controller: AbortController,
): () => void {
  if (signal === undefined) {
    return (): void => undefined;
  }

  if (signal.aborted) {
    controller.abort(createAbortReason(signal));
    return (): void => undefined;
  }

  const onAbort = (): void => {
    controller.abort(createAbortReason(signal));
  };

  signal.addEventListener("abort", onAbort, { once: true });

  return (): void => {
    signal.removeEventListener("abort", onAbort);
  };
}

async function settleTask<T, E>(
  task: SafeTask<T, E>,
  signal: AbortSignal,
): Promise<SafeResult<T, E>> {
  try {
    return await task(signal);
  } catch (error: unknown) {
    return [error as E, null];
  }
}

async function settleMappedItem<Item, Value, E>(
  mapper: MapLimitMapper<Item, Value, E>,
  item: Item,
  index: number,
  signal: AbortSignal,
): Promise<SafeResult<Value, E>> {
  try {
    return await mapper(item, index, signal);
  } catch (error: unknown) {
    return [error as E, null];
  }
}

function validateConcurrency(concurrency: number): void {
  if (!Number.isInteger(concurrency) || concurrency < 1) {
    throw new RangeError("concurrency must be a positive integer.");
  }
}

/**
 * Runs tuple-returning tasks in parallel and cancels siblings on the first
 * error.
 */
export async function all<Tasks extends readonly SafeTask<any, any>[]>(
  tasks: Tasks,
  options: ParallelOptions = {},
): Promise<SafeResult<AllValues<Tasks>, ParallelError<Tasks>>> {
  if (tasks.length === 0) {
    return [null, [] as unknown as AllValues<Tasks>];
  }

  const controller = new AbortController();
  const cleanup = linkAbortSignal(options.signal, controller);
  const values = new Array(tasks.length) as unknown as AllValues<Tasks>;
  let didFail = false;
  let failure: ParallelError<Tasks> | undefined;

  try {
    const running = tasks.map((task, index) =>
      settleTask(task, controller.signal).then((result): void => {
        if (result[0] !== null) {
          if (!didFail) {
            didFail = true;
            failure = result[0] as ParallelError<Tasks>;

            if (!controller.signal.aborted) {
              controller.abort(result[0]);
            }
          }

          return;
        }

        values[index] = result[1];
      }),
    );

    await Promise.allSettled(running);

    if (didFail) {
      return [failure as ParallelError<Tasks>, null];
    }

    if (controller.signal.aborted) {
      return [createAbortReason(controller.signal) as ParallelError<Tasks>, null];
    }

    return [null, values];
  } finally {
    cleanup();
  }
}

/**
 * Maps many items through a tuple-returning worker while keeping at most
 * `concurrency` operations active at once.
 */
export async function mapLimit<Item, Value, E = Error>(
  items: readonly Item[],
  mapper: MapLimitMapper<Item, Value, E>,
  options: MapLimitOptions,
): Promise<SafeResult<Value[], E>> {
  validateConcurrency(options.concurrency);

  if (items.length === 0) {
    return [null, []];
  }

  const controller = new AbortController();
  const cleanup = linkAbortSignal(options.signal, controller);
  const values = new Array<Value>(items.length);
  const workerCount = Math.min(options.concurrency, items.length);
  let didFail = false;
  let failure: E | undefined;
  let nextIndex = 0;

  const runWorker = async (): Promise<void> => {
    while (!didFail && !controller.signal.aborted) {
      const index = nextIndex;
      nextIndex += 1;

      if (index >= items.length) {
        return;
      }

      const item = items[index] as Item;
      const result = await settleMappedItem(
        mapper,
        item,
        index,
        controller.signal,
      );

      if (result[0] !== null) {
        if (!didFail) {
          didFail = true;
          failure = result[0];

          if (!controller.signal.aborted) {
            controller.abort(result[0]);
          }
        }

        return;
      }

      values[index] = result[1] as Value;
    }
  };

  try {
    await Promise.allSettled(
      Array.from({ length: workerCount }, () => runWorker()),
    );

    if (didFail) {
      return [failure as E, null];
    }

    if (controller.signal.aborted) {
      return [createAbortReason(controller.signal) as E, null];
    }

    return [null, values];
  } finally {
    cleanup();
  }
}

/**
 * Resolves with the first settled tuple result and aborts the remaining tasks.
 */
export async function race<Tasks extends readonly SafeTask<any, any>[]>(
  tasks: Tasks,
  options: ParallelOptions = {},
): Promise<SafeResult<TaskValue<Tasks[number]>, ParallelError<Tasks>>> {
  if (tasks.length === 0) {
    throw new RangeError("race requires at least one task.");
  }

  const controller = new AbortController();
  const cleanup = linkAbortSignal(options.signal, controller);
  let winner:
    | SafeResult<TaskValue<Tasks[number]>, ParallelError<Tasks>>
    | undefined;
  let settled = false;

  try {
    const running = tasks.map((task) =>
      settleTask(task, controller.signal).then((result): void => {
        if (settled) {
          return;
        }

        settled = true;
        winner = result as SafeResult<
          TaskValue<Tasks[number]>,
          ParallelError<Tasks>
        >;

        if (!controller.signal.aborted) {
          controller.abort(new DOMException("Race settled.", "AbortError"));
        }
      }),
    );

    await Promise.allSettled(running);

    if (winner !== undefined) {
      return winner;
    }

    return [createAbortReason(controller.signal) as ParallelError<Tasks>, null];
  } finally {
    cleanup();
  }
}
