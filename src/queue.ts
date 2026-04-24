import type { SafeResult } from "yieldless/error";

export interface QueueOptions {
  readonly capacity?: number;
}

export interface QueueOperationOptions {
  readonly signal?: AbortSignal;
}

export interface AsyncQueue<T, E = Error> extends AsyncIterable<T> {
  readonly capacity: number;
  readonly closed: boolean;
  readonly pendingOffers: number;
  readonly pendingTakes: number;
  readonly size: number;
  clear(): void;
  close(reason?: E): void;
  drain(): T[];
  offer(item: T, options?: QueueOperationOptions): Promise<SafeResult<void, E>>;
  take(options?: QueueOperationOptions): Promise<SafeResult<T, E>>;
}

export class QueueClosedError extends Error {
  constructor(message = "Queue is closed.") {
    super(message);
    this.name = "QueueClosedError";
  }
}

interface OfferWaiter<T, E> {
  readonly item: T;
  readonly resolve: (result: SafeResult<void, E>) => void;
  readonly signal: AbortSignal | undefined;
  readonly onAbort: (() => void) | undefined;
}

interface TakeWaiter<T, E> {
  readonly resolve: (result: SafeResult<T, E>) => void;
  readonly signal: AbortSignal | undefined;
  readonly onAbort: (() => void) | undefined;
}

function createAbortReason(signal: AbortSignal): unknown {
  if ("reason" in signal && signal.reason !== undefined) {
    return signal.reason;
  }

  return new DOMException("This operation was aborted.", "AbortError");
}

function validateCapacity(capacity: number): void {
  if (
    capacity !== Number.POSITIVE_INFINITY &&
    (!Number.isInteger(capacity) || capacity < 1)
  ) {
    throw new RangeError("capacity must be a positive integer.");
  }
}

function cleanupOfferWaiter<T, E>(waiter: OfferWaiter<T, E>): void {
  if (waiter.signal !== undefined && waiter.onAbort !== undefined) {
    waiter.signal.removeEventListener("abort", waiter.onAbort);
  }
}

function cleanupTakeWaiter<T, E>(waiter: TakeWaiter<T, E>): void {
  if (waiter.signal !== undefined && waiter.onAbort !== undefined) {
    waiter.signal.removeEventListener("abort", waiter.onAbort);
  }
}

export function createQueue<T, E = Error>(
  options: QueueOptions = {},
): AsyncQueue<T, E> {
  const capacity = options.capacity ?? Number.POSITIVE_INFINITY;

  validateCapacity(capacity);

  const values: T[] = [];
  const offerWaiters: OfferWaiter<T, E>[] = [];
  const takeWaiters: TakeWaiter<T, E>[] = [];
  let closed = false;
  let closeReason: E = new QueueClosedError() as E;

  const removeOfferWaiter = (waiter: OfferWaiter<T, E>): void => {
    const index = offerWaiters.indexOf(waiter);

    if (index >= 0) {
      offerWaiters.splice(index, 1);
    }
  };

  const removeTakeWaiter = (waiter: TakeWaiter<T, E>): void => {
    const index = takeWaiters.indexOf(waiter);

    if (index >= 0) {
      takeWaiters.splice(index, 1);
    }
  };

  const flushOffers = (): void => {
    while (offerWaiters.length > 0) {
      if (takeWaiters.length === 0 && values.length >= capacity) {
        return;
      }

      const waiter = offerWaiters.shift();

      if (waiter === undefined) {
        return;
      }

      cleanupOfferWaiter(waiter);

      const taker = takeWaiters.shift();

      if (taker !== undefined) {
        cleanupTakeWaiter(taker);
        taker.resolve([null, waiter.item]);
      } else {
        values.push(waiter.item);
      }

      waiter.resolve([null, undefined]);
    }
  };

  const queue: AsyncQueue<T, E> = {
    get capacity(): number {
      return capacity;
    },
    get closed(): boolean {
      return closed;
    },
    get pendingOffers(): number {
      return offerWaiters.length;
    },
    get pendingTakes(): number {
      return takeWaiters.length;
    },
    get size(): number {
      return values.length;
    },
    clear(): void {
      values.splice(0);
      flushOffers();
    },
    close(reason: E = new QueueClosedError() as E): void {
      if (closed) {
        return;
      }

      closed = true;
      closeReason = reason;

      const offers = offerWaiters.splice(0);
      const takes = takeWaiters.splice(0);

      for (const waiter of offers) {
        cleanupOfferWaiter(waiter);
        waiter.resolve([closeReason, null]);
      }

      for (const waiter of takes) {
        cleanupTakeWaiter(waiter);
        waiter.resolve([closeReason, null]);
      }
    },
    drain(): T[] {
      const drained = values.splice(0);
      flushOffers();

      return drained;
    },
    async offer(
      item: T,
      operationOptions: QueueOperationOptions = {},
    ): Promise<SafeResult<void, E>> {
      if (operationOptions.signal?.aborted) {
        return [createAbortReason(operationOptions.signal) as E, null];
      }

      if (closed) {
        return [closeReason, null];
      }

      const taker = takeWaiters.shift();

      if (taker !== undefined) {
        cleanupTakeWaiter(taker);
        taker.resolve([null, item]);
        return [null, undefined];
      }

      if (values.length < capacity) {
        values.push(item);
        return [null, undefined];
      }

      return await new Promise<SafeResult<void, E>>((resolve): void => {
        let waiter: OfferWaiter<T, E>;
        const onAbort = (): void => {
          removeOfferWaiter(waiter);
          resolve([
            operationOptions.signal === undefined
              ? undefined as E
              : createAbortReason(operationOptions.signal) as E,
            null,
          ]);
        };

        waiter = {
          item,
          onAbort,
          resolve,
          signal: operationOptions.signal,
        };

        operationOptions.signal?.addEventListener("abort", onAbort, {
          once: true,
        });
        offerWaiters.push(waiter);
      });
    },
    async take(
      operationOptions: QueueOperationOptions = {},
    ): Promise<SafeResult<T, E>> {
      if (operationOptions.signal?.aborted) {
        return [createAbortReason(operationOptions.signal) as E, null];
      }

      const hasValue = values.length > 0;
      const value = values.shift();

      if (hasValue) {
        flushOffers();
        return [null, value as T];
      }

      const offer = offerWaiters.shift();

      if (offer !== undefined) {
        cleanupOfferWaiter(offer);
        offer.resolve([null, undefined]);
        return [null, offer.item];
      }

      if (closed) {
        return [closeReason, null];
      }

      return await new Promise<SafeResult<T, E>>((resolve): void => {
        let waiter: TakeWaiter<T, E>;
        const onAbort = (): void => {
          removeTakeWaiter(waiter);
          resolve([
            operationOptions.signal === undefined
              ? undefined as E
              : createAbortReason(operationOptions.signal) as E,
            null,
          ]);
        };

        waiter = {
          onAbort,
          resolve,
          signal: operationOptions.signal,
        };

        operationOptions.signal?.addEventListener("abort", onAbort, {
          once: true,
        });
        takeWaiters.push(waiter);
      });
    },
    async *[Symbol.asyncIterator](): AsyncIterator<T> {
      while (true) {
        const [error, value] = await queue.take();

        if (error !== null) {
          return;
        }

        yield value as T;
      }
    },
  };

  return queue;
}
