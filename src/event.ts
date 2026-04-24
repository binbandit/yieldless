import type { SafeResult } from "yieldless/error";

export type EventName = string | symbol;

export interface EventTargetLike {
  addEventListener(
    type: string,
    listener: EventListener,
    options?: AddEventListenerOptions | boolean,
  ): void;
  removeEventListener(
    type: string,
    listener: EventListener,
    options?: EventListenerOptions | boolean,
  ): void;
}

export interface EventEmitterLike {
  once(eventName: EventName, listener: (...args: unknown[]) => void): unknown;
  off?(eventName: EventName, listener: (...args: unknown[]) => void): unknown;
  removeListener?(
    eventName: EventName,
    listener: (...args: unknown[]) => void,
  ): unknown;
}

export type EventSourceLike = EventEmitterLike | EventTargetLike;

export interface OnceEventOptions {
  readonly rejectOn?: EventName | false;
  readonly signal?: AbortSignal;
}

function createAbortReason(signal: AbortSignal): unknown {
  if ("reason" in signal && signal.reason !== undefined) {
    return signal.reason;
  }

  return new DOMException("This operation was aborted.", "AbortError");
}

function isEventTargetLike(source: EventSourceLike): source is EventTargetLike {
  return "addEventListener" in source && "removeEventListener" in source;
}

function normalizeEmitterPayload<T>(args: readonly unknown[]): T {
  if (args.length <= 1) {
    return args[0] as T;
  }

  return args as T;
}

function removeEmitterListener(
  source: EventEmitterLike,
  eventName: EventName,
  listener: (...args: unknown[]) => void,
): void {
  if (typeof source.off === "function") {
    source.off(eventName, listener);
    return;
  }

  source.removeListener?.(eventName, listener);
}

/**
 * Waits for one event from an EventTarget-like or EventEmitter-like source.
 */
export async function onceEvent<T = unknown>(
  source: EventSourceLike,
  eventName: EventName,
  options: OnceEventOptions = {},
): Promise<T> {
  if (options.signal?.aborted) {
    throw createAbortReason(options.signal);
  }

  const isTarget = isEventTargetLike(source);
  const rejectOn =
    options.rejectOn ??
    (isTarget || eventName === "error" ? false : "error");

  if (isTarget && typeof eventName !== "string") {
    throw new TypeError("EventTarget event names must be strings.");
  }

  return await new Promise<T>((resolve, reject): void => {
    let settled = false;

    const settle = (fn: () => void): void => {
      if (settled) {
        return;
      }

      settled = true;
      cleanup();
      fn();
    };

    const onAbort = (): void => {
      settle(() => {
        reject(
          options.signal === undefined
            ? new DOMException("This operation was aborted.", "AbortError")
            : createAbortReason(options.signal),
        );
      });
    };

    const cleanup = (): void => {
      options.signal?.removeEventListener("abort", onAbort);

      if (isTarget) {
        source.removeEventListener(eventName as string, onTargetEvent);

        if (
          rejectOn !== false &&
          rejectOn !== eventName &&
          typeof rejectOn === "string"
        ) {
          source.removeEventListener(rejectOn, onTargetError);
        }

        return;
      }

      removeEmitterListener(source, eventName, onEmitterEvent);

      if (rejectOn !== false && rejectOn !== eventName) {
        removeEmitterListener(source, rejectOn, onEmitterError);
      }
    };

    const onTargetEvent: EventListener = (event): void => {
      settle(() => {
        resolve(event as T);
      });
    };

    const onTargetError: EventListener = (event): void => {
      settle(() => {
        reject(event);
      });
    };

    const onEmitterEvent = (...args: unknown[]): void => {
      settle(() => {
        resolve(normalizeEmitterPayload<T>(args));
      });
    };

    const onEmitterError = (...args: unknown[]): void => {
      settle(() => {
        reject(normalizeEmitterPayload(args));
      });
    };

    options.signal?.addEventListener("abort", onAbort, { once: true });

    if (options.signal?.aborted) {
      onAbort();
      return;
    }

    if (isTarget) {
      source.addEventListener(eventName as string, onTargetEvent, { once: true });

      if (
        rejectOn !== false &&
        rejectOn !== eventName &&
        typeof rejectOn === "string"
      ) {
        source.addEventListener(rejectOn, onTargetError, { once: true });
      }

      return;
    }

    source.once(eventName, onEmitterEvent);

    if (rejectOn !== false && rejectOn !== eventName) {
      source.once(rejectOn, onEmitterError);
    }
  });
}

/**
 * Tuple wrapper for {@link onceEvent}.
 */
export async function onceEventSafe<T = unknown, E = Error>(
  source: EventSourceLike,
  eventName: EventName,
  options: OnceEventOptions = {},
): Promise<SafeResult<T, E>> {
  try {
    return [null, await onceEvent<T>(source, eventName, options)];
  } catch (error: unknown) {
    return [error as E, null];
  }
}
