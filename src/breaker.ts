import type { SafeResult } from "yieldless/error";

export type CircuitBreakerState = "closed" | "half-open" | "open";

export interface CircuitBreakerOptions<E = Error> {
  readonly cooldownMs: number;
  readonly failureThreshold: number;
  readonly shouldTrip?: (error: E) => boolean;
  readonly successThreshold?: number;
  readonly onStateChange?: (
    state: CircuitBreakerState,
    previous: CircuitBreakerState,
  ) => void;
}

export type CircuitBreakerOperation<Args extends readonly unknown[], Value, E = Error> = (
  signal: AbortSignal,
  ...args: Args
) => PromiseLike<SafeResult<Value, E>> | SafeResult<Value, E>;

export interface CircuitBreaker<Args extends readonly unknown[], Value, E = Error> {
  (...args: Args): Promise<SafeResult<Value, E | CircuitOpenError>>;
  readonly failureCount: number;
  readonly state: CircuitBreakerState;
  reset(): void;
}

export class CircuitOpenError extends Error {
  constructor(message = "Circuit breaker is open.") {
    super(message);
    this.name = "CircuitOpenError";
  }
}

function validateOptions<E>(options: CircuitBreakerOptions<E>): void {
  if (!Number.isInteger(options.failureThreshold) || options.failureThreshold < 1) {
    throw new RangeError("failureThreshold must be a positive integer.");
  }

  if (!Number.isFinite(options.cooldownMs) || options.cooldownMs < 0) {
    throw new RangeError("cooldownMs cannot be negative.");
  }

  if (
    options.successThreshold !== undefined &&
    (!Number.isInteger(options.successThreshold) || options.successThreshold < 1)
  ) {
    throw new RangeError("successThreshold must be a positive integer.");
  }
}

export function createCircuitBreaker<
  Args extends readonly unknown[],
  Value,
  E = Error,
>(
  operation: CircuitBreakerOperation<Args, Value, E>,
  options: CircuitBreakerOptions<E>,
): CircuitBreaker<Args, Value, E> {
  validateOptions(options);

  const shouldTrip = options.shouldTrip ?? (() => true);
  const successThreshold = options.successThreshold ?? 1;
  let state: CircuitBreakerState = "closed";
  let failureCount = 0;
  let halfOpenSuccessCount = 0;
  let openedAt = 0;

  const setState = (next: CircuitBreakerState): void => {
    if (state === next) {
      return;
    }

    const previous = state;
    state = next;
    options.onStateChange?.(next, previous);
  };

  const open = (): void => {
    openedAt = Date.now();
    halfOpenSuccessCount = 0;
    setState("open");
  };

  const close = (): void => {
    failureCount = 0;
    halfOpenSuccessCount = 0;
    setState("closed");
  };

  const run = async (...args: Args): Promise<SafeResult<Value, E | CircuitOpenError>> => {
    if (state === "open") {
      if (Date.now() - openedAt < options.cooldownMs) {
        return [new CircuitOpenError(), null];
      }

      setState("half-open");
    }

    let result: SafeResult<Value, E>;

    try {
      result = await operation(new AbortController().signal, ...args);
    } catch (error: unknown) {
      result = [error as E, null];
    }

    if (result[0] === null) {
      if (state === "half-open") {
        halfOpenSuccessCount += 1;

        if (halfOpenSuccessCount >= successThreshold) {
          close();
        }
      } else {
        failureCount = 0;
      }

      return [null, result[1] as Value];
    }

    if (shouldTrip(result[0])) {
      failureCount += 1;
      halfOpenSuccessCount = 0;

      if (state === "half-open" || failureCount >= options.failureThreshold) {
        open();
      }
    }

    return [result[0], null];
  };

  Object.defineProperties(run, {
    failureCount: {
      get(): number {
        return failureCount;
      },
    },
    reset: {
      value(): void {
        close();
      },
    },
    state: {
      get(): CircuitBreakerState {
        return state;
      },
    },
  });

  return run as CircuitBreaker<Args, Value, E>;
}
