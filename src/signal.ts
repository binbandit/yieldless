export interface TimeoutSignalOptions {
  readonly signal?: AbortSignal;
  readonly reason?: unknown;
}

export interface WithTimeoutOptions extends TimeoutSignalOptions {
  readonly timeoutMs: number;
}

export interface TimeoutSignal extends Disposable {
  readonly signal: AbortSignal;
  abort(reason?: unknown): void;
}

export class TimeoutError extends Error {
  readonly code: "ERR_TIMEOUT";
  readonly timeoutMs: number;

  constructor(timeoutMs: number, message = `Operation timed out after ${timeoutMs}ms.`) {
    super(message);
    this.name = "TimeoutError";
    this.code = "ERR_TIMEOUT";
    this.timeoutMs = timeoutMs;
  }
}

function createAbortReason(signal: AbortSignal): unknown {
  if ("reason" in signal && signal.reason !== undefined) {
    return signal.reason;
  }

  return new DOMException("This operation was aborted.", "AbortError");
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

class TimeoutSignalController implements TimeoutSignal {
  readonly signal: AbortSignal;

  #controller: AbortController;
  #cleanupParent: () => void;
  #disposed: boolean;
  #timer: ReturnType<typeof setTimeout> | null;

  constructor(timeoutMs: number, options: TimeoutSignalOptions) {
    this.#controller = new AbortController();
    this.signal = this.#controller.signal;
    this.#disposed = false;
    this.#timer = null;
    this.#cleanupParent = this.linkParentSignal(options.signal);

    if (!this.signal.aborted) {
      this.#timer = setTimeout((): void => {
        this.abort(options.reason ?? new TimeoutError(timeoutMs));
      }, timeoutMs);
    }
  }

  abort(reason?: unknown): void {
    if (this.signal.aborted) {
      this[Symbol.dispose]();
      return;
    }

    this.#controller.abort(reason);
    this[Symbol.dispose]();
  }

  [Symbol.dispose](): void {
    if (this.#disposed) {
      return;
    }

    this.#disposed = true;
    this.#cleanupParent();

    if (this.#timer !== null) {
      clearTimeout(this.#timer);
      this.#timer = null;
    }
  }

  private linkParentSignal(signal: AbortSignal | undefined): () => void {
    if (signal === undefined) {
      return (): void => undefined;
    }

    if (signal.aborted) {
      this.#controller.abort(createAbortReason(signal));
      return (): void => undefined;
    }

    const onAbort = (): void => {
      this.abort(createAbortReason(signal));
    };

    signal.addEventListener("abort", onAbort, { once: true });

    return (): void => {
      signal.removeEventListener("abort", onAbort);
    };
  }
}

/**
 * Creates a derived AbortSignal that aborts when either the parent signal
 * aborts or the timeout expires. Dispose it to clear timers and listeners.
 */
export function createTimeoutSignal(
  timeoutMs: number,
  options: TimeoutSignalOptions = {},
): TimeoutSignal {
  if (timeoutMs < 0) {
    throw new RangeError("timeoutMs cannot be negative.");
  }

  return new TimeoutSignalController(timeoutMs, options);
}

/**
 * Runs an abort-aware operation with a deadline and cleans up the derived
 * signal automatically when the operation settles.
 */
export async function withTimeout<T>(
  operation: (signal: AbortSignal) => PromiseLike<T> | T,
  options: WithTimeoutOptions,
): Promise<T> {
  const timeout = createTimeoutSignal(options.timeoutMs, options);

  try {
    throwIfAborted(timeout.signal);
    return await operation(timeout.signal);
  } finally {
    timeout[Symbol.dispose]();
  }
}
