import type { SafeResult } from "yieldless/error";

export type RetryOperation<T, E = Error> = (
  attempt: number,
  signal: AbortSignal,
) => PromiseLike<SafeResult<T, E>> | SafeResult<T, E>;

export type RetryJitter =
  | "full"
  | "none"
  | ((delayMs: number, attempt: number) => number);

export interface RetryState<E> {
  readonly attempt: number;
  readonly delayMs: number;
  readonly error: E;
  readonly signal: AbortSignal;
}

export interface RetryOptions<E = Error> {
  readonly signal?: AbortSignal;
  readonly maxAttempts?: number;
  readonly baseDelayMs?: number;
  readonly maxDelayMs?: number;
  readonly factor?: number;
  readonly jitter?: RetryJitter;
  readonly shouldRetry?: (error: E, attempt: number) => boolean;
  readonly onRetry?: (
    state: RetryState<E>,
  ) => void | PromiseLike<void>;
}

function createAbortReason(signal: AbortSignal): unknown {
  if ("reason" in signal) {
    return signal.reason;
  }

  return new DOMException("This operation was aborted.", "AbortError");
}

function computeDelay<E>(
  attempt: number,
  options: RetryOptions<E>,
): number {
  const baseDelayMs: number = options.baseDelayMs ?? 100;
  const maxDelayMs: number = options.maxDelayMs ?? 30_000;
  const factor: number = options.factor ?? 2;
  const cappedDelay: number = Math.min(
    baseDelayMs * factor ** (attempt - 1),
    maxDelayMs,
  );
  const jitter: RetryJitter = options.jitter ?? "full";

  if (jitter === "none") {
    return cappedDelay;
  }

  if (jitter === "full") {
    return Math.random() * cappedDelay;
  }

  return jitter(cappedDelay, attempt);
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

async function sleep(delayMs: number, signal: AbortSignal): Promise<void> {
  if (signal.aborted) {
    throw createAbortReason(signal);
  }

  if (delayMs <= 0) {
    return;
  }

  await new Promise<void>((resolve, reject): void => {
    const timer = setTimeout((): void => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, delayMs);

    const onAbort = (): void => {
      clearTimeout(timer);
      signal.removeEventListener("abort", onAbort);
      reject(createAbortReason(signal));
    };

    signal.addEventListener("abort", onAbort, { once: true });
  });
}

function validateRetryOptions<E>(options: RetryOptions<E>): void {
  if ((options.maxAttempts ?? 3) < 1) {
    throw new RangeError("maxAttempts must be at least 1.");
  }

  if ((options.baseDelayMs ?? 100) < 0) {
    throw new RangeError("baseDelayMs cannot be negative.");
  }

  if ((options.maxDelayMs ?? 30_000) < 0) {
    throw new RangeError("maxDelayMs cannot be negative.");
  }

  if ((options.factor ?? 2) < 1) {
    throw new RangeError("factor must be at least 1.");
  }
}

/**
 * Retries a tuple-returning operation with exponential backoff and abort-aware
 * delays.
 */
export async function safeRetry<T, E = Error>(
  operation: RetryOperation<T, E>,
  options: RetryOptions<E> = {},
): Promise<SafeResult<T, E>> {
  validateRetryOptions(options);

  const controller = new AbortController();
  const cleanup = linkAbortSignal(options.signal, controller);
  const maxAttempts: number = options.maxAttempts ?? 3;
  const shouldRetry =
    options.shouldRetry ??
    (() => true);

  try {
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      if (controller.signal.aborted) {
        return [createAbortReason(controller.signal) as E, null];
      }

      let result: SafeResult<T, E>;

      try {
        result = await operation(attempt, controller.signal);
      } catch (error: unknown) {
        result = [error as E, null];
      }

      if (result[0] === null) {
        return result;
      }

      if (attempt >= maxAttempts || !shouldRetry(result[0], attempt)) {
        return result;
      }

      const delayMs = computeDelay(attempt, options);

      if (options.onRetry !== undefined) {
        try {
          await options.onRetry({
            attempt,
            delayMs,
            error: result[0],
            signal: controller.signal,
          });
        } catch (error: unknown) {
          return [error as E, null];
        }
      }

      try {
        await sleep(delayMs, controller.signal);
      } catch (error: unknown) {
        return [error as E, null];
      }
    }

    return [new Error("Retry loop completed without a result.") as E, null];
  } finally {
    cleanup();
  }
}
