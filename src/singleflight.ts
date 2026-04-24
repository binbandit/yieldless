import type { SafeResult } from "yieldless/error";

export type SingleFlightOperation<Args extends readonly unknown[], T, E = Error> = (
  signal: AbortSignal,
  ...args: Args
) => PromiseLike<SafeResult<T, E>> | SafeResult<T, E>;

export interface SingleFlightOptions<Args extends readonly unknown[]> {
  readonly getKey?: (...args: Args) => string;
  readonly signal?: AbortSignal;
}

export interface SingleFlight<Args extends readonly unknown[], T, E = Error> {
  (...args: Args): Promise<SafeResult<T, E>>;
  clear(...args: Args): void;
  clearAll(): void;
  has(...args: Args): boolean;
  readonly size: number;
}

interface InFlight<T, E> {
  readonly controller: AbortController;
  readonly promise: Promise<SafeResult<T, E>>;
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

function defaultGetKey(...args: readonly unknown[]): string {
  return JSON.stringify(args);
}

/**
 * Deduplicates concurrent calls with the same key so only one operation runs
 * at a time.
 */
export function singleFlight<Args extends readonly unknown[], T, E = Error>(
  operation: SingleFlightOperation<Args, T, E>,
  options: SingleFlightOptions<Args> = {},
): SingleFlight<Args, T, E> {
  const inFlight = new Map<string, InFlight<T, E>>();
  const getKey = options.getKey ?? defaultGetKey;

  const run = (...args: Args): Promise<SafeResult<T, E>> => {
    const key = getKey(...args);
    const existing = inFlight.get(key);

    if (existing !== undefined) {
      return existing.promise;
    }

    const controller = new AbortController();
    const cleanup = linkAbortSignal(options.signal, controller);

    const promise = Promise.resolve()
      .then(async (): Promise<SafeResult<T, E>> => {
        if (controller.signal.aborted) {
          return [createAbortReason(controller.signal) as E, null];
        }

        try {
          return await operation(controller.signal, ...args);
        } catch (error: unknown) {
          return [error as E, null];
        }
      })
      .finally((): void => {
        cleanup();
        inFlight.delete(key);
      });

    inFlight.set(key, {
      controller,
      promise,
    });

    return promise;
  };

  Object.defineProperties(run, {
    clear: {
      value(...args: Args): void {
        const key = getKey(...args);
        const existing = inFlight.get(key);

        if (existing !== undefined) {
          existing.controller.abort(
            new DOMException("Single flight entry cleared.", "AbortError"),
          );
          inFlight.delete(key);
        }
      },
    },
    clearAll: {
      value(): void {
        for (const existing of inFlight.values()) {
          existing.controller.abort(
            new DOMException("Single flight entries cleared.", "AbortError"),
          );
        }

        inFlight.clear();
      },
    },
    has: {
      value(...args: Args): boolean {
        return inFlight.has(getKey(...args));
      },
    },
    size: {
      get(): number {
        return inFlight.size;
      },
    },
  });

  return run as SingleFlight<Args, T, E>;
}
