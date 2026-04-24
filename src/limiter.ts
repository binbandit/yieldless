import type { SafeResult } from "yieldless/error";

export interface AcquirePermitOptions {
  readonly signal?: AbortSignal;
}

export interface SemaphorePermit {
  release(): void;
  [Symbol.dispose](): void;
}

export interface Semaphore {
  readonly available: number;
  readonly capacity: number;
  readonly pending: number;
  acquire(options?: AcquirePermitOptions): Promise<SemaphorePermit>;
  tryAcquire(): SemaphorePermit | null;
  withPermit<T>(
    operation: (signal: AbortSignal) => PromiseLike<T> | T,
    options?: AcquirePermitOptions,
  ): Promise<T>;
}

export interface RateLimiterOptions {
  readonly intervalMs: number;
  readonly limit: number;
}

export interface RateLimiter {
  readonly pending: number;
  clear(reason?: unknown): void;
  take(options?: AcquirePermitOptions): Promise<void>;
  takeSafe<E = Error>(options?: AcquirePermitOptions): Promise<SafeResult<void, E>>;
}

export type LimitedOperation<T, E = Error> = (
  signal: AbortSignal,
) => PromiseLike<SafeResult<T, E>> | SafeResult<T, E>;

interface Waiter<T> {
  readonly reject: (error: unknown) => void;
  readonly resolve: (value: T) => void;
  readonly signal: AbortSignal | undefined;
  readonly onAbort: (() => void) | undefined;
}

interface RateWaiter extends Waiter<void> {
  readonly timer: ReturnType<typeof setTimeout>;
}

function createAbortReason(signal: AbortSignal): unknown {
  if ("reason" in signal && signal.reason !== undefined) {
    return signal.reason;
  }

  return new DOMException("This operation was aborted.", "AbortError");
}

function validatePositiveInteger(name: string, value: number): void {
  if (!Number.isInteger(value) || value < 1) {
    throw new RangeError(`${name} must be a positive integer.`);
  }
}

function validateDelay(name: string, delayMs: number): void {
  if (!Number.isFinite(delayMs) || delayMs < 0) {
    throw new RangeError(`${name} cannot be negative.`);
  }
}

function cleanupWaiter<T>(waiter: Waiter<T>): void {
  if (waiter.signal !== undefined && waiter.onAbort !== undefined) {
    waiter.signal.removeEventListener("abort", waiter.onAbort);
  }
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

export function createSemaphore(capacity: number): Semaphore {
  validatePositiveInteger("capacity", capacity);

  const waiters: Waiter<SemaphorePermit>[] = [];
  let available = capacity;

  const createPermit = (): SemaphorePermit => {
    let released = false;

    const release = (): void => {
      if (released) {
        return;
      }

      released = true;
      const waiter = waiters.shift();

      if (waiter === undefined) {
        available += 1;
        return;
      }

      cleanupWaiter(waiter);
      waiter.resolve(createPermit());
    };

    return {
      release,
      [Symbol.dispose]: release,
    };
  };

  const removeWaiter = (waiter: Waiter<SemaphorePermit>): void => {
    const index = waiters.indexOf(waiter);

    if (index >= 0) {
      waiters.splice(index, 1);
    }
  };

  return {
    get available(): number {
      return available;
    },
    capacity,
    get pending(): number {
      return waiters.length;
    },
    async acquire(options: AcquirePermitOptions = {}): Promise<SemaphorePermit> {
      if (options.signal?.aborted) {
        throw createAbortReason(options.signal);
      }

      if (available > 0) {
        available -= 1;
        return createPermit();
      }

      return await new Promise<SemaphorePermit>((resolve, reject): void => {
        let queued: Waiter<SemaphorePermit>;
        const onAbort = (): void => {
          removeWaiter(queued);
          reject(
            options.signal === undefined
              ? undefined
              : createAbortReason(options.signal),
          );
        };

        queued = {
          onAbort,
          reject,
          resolve,
          signal: options.signal,
        };

        options.signal?.addEventListener("abort", onAbort, { once: true });
        waiters.push(queued);
      });
    },
    tryAcquire(): SemaphorePermit | null {
      if (available <= 0) {
        return null;
      }

      available -= 1;
      return createPermit();
    },
    async withPermit<T>(
      operation: (signal: AbortSignal) => PromiseLike<T> | T,
      options: AcquirePermitOptions = {},
    ): Promise<T> {
      const controller = new AbortController();
      const cleanup = linkAbortSignal(options.signal, controller);
      const permit = await this.acquire({ signal: controller.signal });

      try {
        return await operation(controller.signal);
      } finally {
        permit.release();
        cleanup();
      }
    },
  };
}

export async function withPermit<T, E = Error>(
  semaphore: Semaphore,
  operation: LimitedOperation<T, E>,
  options: AcquirePermitOptions = {},
): Promise<SafeResult<T, E>> {
  try {
    return await semaphore.withPermit(operation, options);
  } catch (error: unknown) {
    return [error as E, null];
  }
}

export function createRateLimiter(options: RateLimiterOptions): RateLimiter {
  validatePositiveInteger("limit", options.limit);
  validateDelay("intervalMs", options.intervalMs);

  const waiters: RateWaiter[] = [];
  let windowStart = Date.now();
  let usedInWindow = 0;

  const removeWaiter = (waiter: RateWaiter): void => {
    const index = waiters.indexOf(waiter);

    if (index >= 0) {
      waiters.splice(index, 1);
    }
  };

  const reserveSlot = (): number => {
    const now = Date.now();

    if (now >= windowStart + options.intervalMs) {
      windowStart = now;
      usedInWindow = 0;
    }

    if (usedInWindow >= options.limit) {
      windowStart += options.intervalMs;
      usedInWindow = 0;
    }

    usedInWindow += 1;

    return windowStart;
  };

  const take = async (takeOptions: AcquirePermitOptions = {}): Promise<void> => {
    if (takeOptions.signal?.aborted) {
      throw createAbortReason(takeOptions.signal);
    }

    const delayMs = Math.max(0, reserveSlot() - Date.now());

    if (delayMs === 0) {
      return;
    }

    await new Promise<void>((resolve, reject): void => {
      let queued: RateWaiter;
      const timer = setTimeout((): void => {
        removeWaiter(queued);
        cleanupWaiter(queued);
        resolve();
      }, delayMs);
      const onAbort = (): void => {
        clearTimeout(timer);
        removeWaiter(queued);
        reject(
          takeOptions.signal === undefined
            ? undefined
            : createAbortReason(takeOptions.signal),
        );
      };

      queued = {
        onAbort,
        reject,
        resolve,
        signal: takeOptions.signal,
        timer,
      };

      takeOptions.signal?.addEventListener("abort", onAbort, { once: true });
      waiters.push(queued);
    });
  };

  return {
    get pending(): number {
      return waiters.length;
    },
    clear(reason: unknown = new Error("Rate limiter cleared.")): void {
      const queued = waiters.splice(0);

      for (const waiter of queued) {
        clearTimeout(waiter.timer);
        cleanupWaiter(waiter);
        waiter.reject(reason);
      }
    },
    async take(takeOptions: AcquirePermitOptions = {}): Promise<void> {
      return await take(takeOptions);
    },
    async takeSafe<E = Error>(
      takeOptions: AcquirePermitOptions = {},
    ): Promise<SafeResult<void, E>> {
      try {
        await this.take(takeOptions);
        return [null, undefined];
      } catch (error: unknown) {
        return [error as E, null];
      }
    },
  };
}
