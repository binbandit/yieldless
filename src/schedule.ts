import type { SafeResult } from "yieldless/error";
import { sleep } from "yieldless/timer";

export type ScheduleJitter =
  | "full"
  | "none"
  | ((delayMs: number, attempt: number) => number);

export interface ScheduleState<E = unknown> {
  readonly attempt: number;
  readonly elapsedMs: number;
  readonly error?: E;
  readonly signal: AbortSignal;
}

export interface ScheduleDecision {
  readonly continue: boolean;
  readonly delayMs: number;
}

export type SchedulePolicy<E = unknown> = (
  state: ScheduleState<E>,
) => ScheduleDecision;

export interface ExponentialBackoffOptions {
  readonly baseDelayMs?: number;
  readonly factor?: number;
  readonly jitter?: ScheduleJitter;
  readonly maxDelayMs?: number;
}

export interface RunScheduleOptions {
  readonly signal?: AbortSignal;
}

export type ScheduledOperation<T, E = Error> = (
  attempt: number,
  signal: AbortSignal,
) => PromiseLike<SafeResult<T, E>> | SafeResult<T, E>;

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

function validatePositiveInteger(name: string, value: number): void {
  if (!Number.isInteger(value) || value < 1) {
    throw new RangeError(`${name} must be a positive integer.`);
  }
}

function normalizeDelay(delayMs: number): number {
  return Math.max(0, delayMs);
}

function applyJitter(
  delayMs: number,
  attempt: number,
  jitter: ScheduleJitter,
): number {
  if (jitter === "none") {
    return delayMs;
  }

  if (jitter === "full") {
    return Math.random() * delayMs;
  }

  return normalizeDelay(jitter(delayMs, attempt));
}

export function continueNow<E = unknown>(): SchedulePolicy<E> {
  return (): ScheduleDecision => ({
    continue: true,
    delayMs: 0,
  });
}

export function stopSchedule<E = unknown>(): SchedulePolicy<E> {
  return (): ScheduleDecision => ({
    continue: false,
    delayMs: 0,
  });
}

export function fixedDelay<E = unknown>(delayMs: number): SchedulePolicy<E> {
  validateDelay("delayMs", delayMs);

  return (): ScheduleDecision => ({
    continue: true,
    delayMs,
  });
}

export function exponentialBackoff<E = unknown>(
  options: ExponentialBackoffOptions = {},
): SchedulePolicy<E> {
  const baseDelayMs = options.baseDelayMs ?? 100;
  const factor = options.factor ?? 2;
  const jitter = options.jitter ?? "full";
  const maxDelayMs = options.maxDelayMs ?? 30_000;

  validateDelay("baseDelayMs", baseDelayMs);
  validateDelay("maxDelayMs", maxDelayMs);

  if (!Number.isFinite(factor) || factor < 1) {
    throw new RangeError("factor must be at least 1.");
  }

  return (state): ScheduleDecision => {
    const cappedDelay = Math.min(
      baseDelayMs * factor ** (state.attempt - 1),
      maxDelayMs,
    );

    return {
      continue: true,
      delayMs: applyJitter(cappedDelay, state.attempt, jitter),
    };
  };
}

export function maxAttempts<E = unknown>(attempts: number): SchedulePolicy<E> {
  validatePositiveInteger("attempts", attempts);

  return (state): ScheduleDecision => ({
    continue: state.attempt < attempts,
    delayMs: 0,
  });
}

export function maxElapsedTime<E = unknown>(
  maxElapsedMs: number,
): SchedulePolicy<E> {
  validateDelay("maxElapsedMs", maxElapsedMs);

  return (state): ScheduleDecision => ({
    continue: state.elapsedMs < maxElapsedMs,
    delayMs: 0,
  });
}

export function composeSchedules<E = unknown>(
  ...policies: readonly SchedulePolicy<E>[]
): SchedulePolicy<E> {
  return (state): ScheduleDecision => {
    let delayMs = 0;

    for (const policy of policies) {
      const decision = policy(state);

      if (!decision.continue) {
        return {
          continue: false,
          delayMs: 0,
        };
      }

      delayMs = Math.max(delayMs, decision.delayMs);
    }

    return {
      continue: true,
      delayMs,
    };
  };
}

export function getScheduleDecision<E>(
  policy: SchedulePolicy<E>,
  state: ScheduleState<E>,
): ScheduleDecision {
  if (state.signal.aborted) {
    return {
      continue: false,
      delayMs: 0,
    };
  }

  const decision = policy(state);

  return {
    continue: decision.continue,
    delayMs: normalizeDelay(decision.delayMs),
  };
}

export async function waitForSchedule<E = Error>(
  policy: SchedulePolicy<E>,
  state: ScheduleState<E>,
): Promise<SafeResult<void, E>> {
  const decision = getScheduleDecision(policy, state);

  if (!decision.continue) {
    return [state.error as E, null];
  }

  try {
    await sleep(decision.delayMs, { signal: state.signal });
    return [null, undefined];
  } catch (error: unknown) {
    return [error as E, null];
  }
}

export async function runScheduled<T, E = Error>(
  operation: ScheduledOperation<T, E>,
  policy: SchedulePolicy<E>,
  options: RunScheduleOptions = {},
): Promise<SafeResult<T, E>> {
  const controller = new AbortController();
  const cleanup = linkAbortSignal(options.signal, controller);
  const startedAt = Date.now();

  try {
    for (let attempt = 1; ; attempt += 1) {
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

      const [waitError] = await waitForSchedule(policy, {
        attempt,
        elapsedMs: Date.now() - startedAt,
        error: result[0],
        signal: controller.signal,
      });

      if (waitError !== null) {
        return [waitError, null];
      }
    }
  } finally {
    cleanup();
  }
}
