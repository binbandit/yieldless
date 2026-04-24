import type { SafeResult } from "yieldless/error";
import { createTimeoutSignal } from "yieldless/signal";

export interface SleepOptions {
  readonly signal?: AbortSignal;
}

export type PollOperation<T, E = Error> = (
  attempt: number,
  signal: AbortSignal,
) => PromiseLike<SafeResult<T, E>> | SafeResult<T, E>;

export interface PollOptions<E = Error> {
  readonly intervalMs: number;
  readonly maxAttempts?: number;
  readonly signal?: AbortSignal;
  readonly shouldContinue?: (error: E, attempt: number) => boolean;
  readonly timeoutMs?: number;
}

function createAbortReason(signal: AbortSignal): unknown {
  if ("reason" in signal && signal.reason !== undefined) {
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

function validateDelay(name: string, delayMs: number): void {
  if (!Number.isFinite(delayMs) || delayMs < 0) {
    throw new RangeError(`${name} cannot be negative.`);
  }
}

function validatePollOptions<E>(options: PollOptions<E>): void {
  validateDelay("intervalMs", options.intervalMs);

  if (options.timeoutMs !== undefined) {
    validateDelay("timeoutMs", options.timeoutMs);
  }

  if (
    options.maxAttempts !== undefined &&
    (!Number.isInteger(options.maxAttempts) || options.maxAttempts < 1)
  ) {
    throw new RangeError("maxAttempts must be a positive integer.");
  }
}

/**
 * Waits for a duration and rejects with the abort reason if the signal aborts.
 */
export async function sleep(
  delayMs: number,
  options: SleepOptions = {},
): Promise<void> {
  validateDelay("delayMs", delayMs);

  const signal = options.signal;

  if (signal?.aborted) {
    throw createAbortReason(signal);
  }

  if (delayMs === 0) {
    return;
  }

  await new Promise<void>((resolve, reject): void => {
    const timer = setTimeout((): void => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, delayMs);

    const onAbort = (): void => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
      reject(signal === undefined ? undefined : createAbortReason(signal));
    };

    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

/**
 * Tuple wrapper for {@link sleep}.
 */
export async function sleepSafe<E = Error>(
  delayMs: number,
  options: SleepOptions = {},
): Promise<SafeResult<void, E>> {
  try {
    await sleep(delayMs, options);
    return [null, undefined];
  } catch (error: unknown) {
    return [error as E, null];
  }
}

/**
 * Repeats a tuple-returning operation at a fixed interval until it succeeds,
 * stops retrying, times out, or is aborted.
 */
export async function poll<T, E = Error>(
  operation: PollOperation<T, E>,
  options: PollOptions<E>,
): Promise<SafeResult<T, E>> {
  validatePollOptions(options);

  const controller = new AbortController();
  const cleanupParent = linkAbortSignal(options.signal, controller);
  const timeoutOptions = { signal: controller.signal };
  const timeout =
    options.timeoutMs === undefined
      ? null
      : createTimeoutSignal(options.timeoutMs, timeoutOptions);
  const signal = timeout?.signal ?? controller.signal;
  const shouldContinue = options.shouldContinue ?? (() => true);
  let lastResult: SafeResult<T, E> | undefined;

  try {
    for (let attempt = 1; ; attempt += 1) {
      if (signal.aborted) {
        return [createAbortReason(signal) as E, null];
      }

      try {
        lastResult = await operation(attempt, signal);
      } catch (error: unknown) {
        lastResult = [error as E, null];
      }

      if (lastResult[0] === null) {
        return lastResult;
      }

      if (
        attempt >= (options.maxAttempts ?? Number.POSITIVE_INFINITY) ||
        !shouldContinue(lastResult[0], attempt)
      ) {
        return lastResult;
      }

      try {
        await sleep(options.intervalMs, { signal });
      } catch (error: unknown) {
        return [error as E, null];
      }
    }
  } finally {
    timeout?.[Symbol.dispose]();
    cleanupParent();
  }
}
