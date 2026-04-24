export interface Deferred<T> {
  readonly promise: Promise<T>;
  reject(reason?: unknown): void;
  resolve(value: T | PromiseLike<T>): void;
}

export interface TestSignal {
  readonly controller: AbortController;
  readonly signal: AbortSignal;
  abort(reason?: unknown): void;
}

export interface ManualClockSleepOptions {
  readonly signal?: AbortSignal;
}

export interface ManualClock {
  readonly now: number;
  readonly pending: number;
  runAll(): void;
  sleep(delayMs: number, options?: ManualClockSleepOptions): Promise<void>;
  tick(ms: number): void;
}

interface ManualTimer {
  readonly reject: (reason: unknown) => void;
  readonly resolve: () => void;
  readonly signal: AbortSignal | undefined;
  readonly onAbort: (() => void) | undefined;
  readonly time: number;
}

function createAbortReason(signal: AbortSignal): unknown {
  if ("reason" in signal && signal.reason !== undefined) {
    return signal.reason;
  }

  return new DOMException("This operation was aborted.", "AbortError");
}

function validateDelay(delayMs: number): void {
  if (!Number.isFinite(delayMs) || delayMs < 0) {
    throw new RangeError("delayMs cannot be negative.");
  }
}

function cleanupTimer(timer: ManualTimer): void {
  if (timer.signal !== undefined && timer.onAbort !== undefined) {
    timer.signal.removeEventListener("abort", timer.onAbort);
  }
}

export function deferred<T>(): Deferred<T> {
  let reject!: (reason?: unknown) => void;
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>((innerResolve, innerReject): void => {
    resolve = innerResolve;
    reject = innerReject;
  });

  return {
    promise,
    reject,
    resolve,
  };
}

export async function flushMicrotasks(times = 1): Promise<void> {
  if (!Number.isInteger(times) || times < 1) {
    throw new RangeError("times must be a positive integer.");
  }

  for (let index = 0; index < times; index += 1) {
    await Promise.resolve();
  }
}

export function createTestSignal(): TestSignal {
  const controller = new AbortController();

  return {
    controller,
    signal: controller.signal,
    abort(reason?: unknown): void {
      controller.abort(reason);
    },
  };
}

export function createManualClock(start = 0): ManualClock {
  let now = start;
  const timers: ManualTimer[] = [];

  const removeTimer = (timer: ManualTimer): void => {
    const index = timers.indexOf(timer);

    if (index >= 0) {
      timers.splice(index, 1);
    }
  };

  const settleDueTimers = (): void => {
    timers.sort((left, right) => left.time - right.time);

    while (timers.length > 0) {
      const timer = timers[0];

      if (timer === undefined || timer.time > now) {
        return;
      }

      timers.shift();
      cleanupTimer(timer);
      timer.resolve();
    }
  };

  return {
    get now(): number {
      return now;
    },
    get pending(): number {
      return timers.length;
    },
    runAll(): void {
      while (timers.length > 0) {
        const next = timers
          .map((timer) => timer.time)
          .reduce((left, right) => Math.min(left, right));

        now = Math.max(now, next);
        settleDueTimers();
      }
    },
    async sleep(
      delayMs: number,
      options: ManualClockSleepOptions = {},
    ): Promise<void> {
      validateDelay(delayMs);

      if (options.signal?.aborted) {
        throw createAbortReason(options.signal);
      }

      if (delayMs === 0) {
        return;
      }

      await new Promise<void>((resolve, reject): void => {
        let timer: ManualTimer;
        const onAbort = (): void => {
          removeTimer(timer);
          reject(
            options.signal === undefined
              ? undefined
              : createAbortReason(options.signal),
          );
        };

        timer = {
          onAbort,
          reject,
          resolve,
          signal: options.signal,
          time: now + delayMs,
        };

        options.signal?.addEventListener("abort", onAbort, { once: true });
        timers.push(timer);
        settleDueTimers();
      });
    },
    tick(ms: number): void {
      validateDelay(ms);
      now += ms;
      settleDueTimers();
    },
  };
}
