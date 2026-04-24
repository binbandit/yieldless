import type { SafeResult } from "yieldless/error";

export type AnyIterable<T> = Iterable<T> | AsyncIterable<T>;

export interface IterableOptions {
  readonly signal?: AbortSignal;
}

export interface MapAsyncLimitOptions extends IterableOptions {
  readonly concurrency: number;
}

export type IterableWorker<Item, E = Error> = (
  item: Item,
  index: number,
  signal: AbortSignal,
) => PromiseLike<SafeResult<void, E>> | SafeResult<void, E>;

export type IterableMapper<Item, Value, E = Error> = (
  item: Item,
  index: number,
  signal: AbortSignal,
) => PromiseLike<SafeResult<Value, E>> | SafeResult<Value, E>;

interface IndexedItem<Item> {
  readonly done: boolean;
  readonly index: number;
  readonly value?: Item;
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

async function* toAsyncIterable<T>(
  iterable: AnyIterable<T>,
): AsyncGenerator<T> {
  yield* iterable;
}

function validateConcurrency(concurrency: number): void {
  if (!Number.isInteger(concurrency) || concurrency < 1) {
    throw new RangeError("concurrency must be a positive integer.");
  }
}

/**
 * Collects every item from a sync or async iterable into an array tuple.
 */
export async function collect<T, E = Error>(
  iterable: AnyIterable<T>,
  options: IterableOptions = {},
): Promise<SafeResult<T[], E>> {
  const controller = new AbortController();
  const cleanup = linkAbortSignal(options.signal, controller);
  const values: T[] = [];

  try {
    for await (const item of toAsyncIterable(iterable)) {
      if (controller.signal.aborted) {
        return [createAbortReason(controller.signal) as E, null];
      }

      values.push(item);
    }

    if (controller.signal.aborted) {
      return [createAbortReason(controller.signal) as E, null];
    }

    return [null, values];
  } catch (error: unknown) {
    return [error as E, null];
  } finally {
    cleanup();
  }
}

/**
 * Runs a tuple-returning worker for every iterable item in sequence.
 */
export async function forEach<Item, E = Error>(
  iterable: AnyIterable<Item>,
  worker: IterableWorker<Item, E>,
  options: IterableOptions = {},
): Promise<SafeResult<void, E>> {
  const controller = new AbortController();
  const cleanup = linkAbortSignal(options.signal, controller);
  let index = 0;

  try {
    for await (const item of toAsyncIterable(iterable)) {
      if (controller.signal.aborted) {
        return [createAbortReason(controller.signal) as E, null];
      }

      let result: SafeResult<void, E>;

      try {
        result = await worker(item, index, controller.signal);
      } catch (error: unknown) {
        result = [error as E, null];
      }

      if (result[0] !== null) {
        return result;
      }

      index += 1;
    }

    if (controller.signal.aborted) {
      return [createAbortReason(controller.signal) as E, null];
    }

    return [null, undefined];
  } finally {
    cleanup();
  }
}

/**
 * Maps a sync or async iterable with bounded parallelism and preserves input
 * order in the returned array.
 */
export async function mapAsyncLimit<Item, Value, E = Error>(
  iterable: AnyIterable<Item>,
  mapper: IterableMapper<Item, Value, E>,
  options: MapAsyncLimitOptions,
): Promise<SafeResult<Value[], E>> {
  validateConcurrency(options.concurrency);

  const controller = new AbortController();
  const cleanup = linkAbortSignal(options.signal, controller);
  const iterator = toAsyncIterable(iterable)[Symbol.asyncIterator]();
  const values: Value[] = [];
  const running = new Set<Promise<void>>();
  let didFail = false;
  let failure: E | undefined;
  let didFinishReading = false;
  let nextIndex = 0;

  const readNext = async (): Promise<IndexedItem<Item>> => {
    const next = await iterator.next();

    if (next.done === true) {
      return {
        done: true,
        index: nextIndex,
      };
    }

    const index = nextIndex;
    nextIndex += 1;

    return {
      done: false,
      index,
      value: next.value,
    };
  };

  const closeIterator = async (): Promise<void> => {
    if (typeof iterator.return === "function") {
      await iterator.return(undefined);
    }
  };

  const fail = (error: E): void => {
    if (!didFail) {
      didFail = true;
      failure = error;

      if (!controller.signal.aborted) {
        controller.abort(error);
      }
    }
  };

  const startNext = async (): Promise<void> => {
    if (didFail || didFinishReading || controller.signal.aborted) {
      return;
    }

    let item: IndexedItem<Item>;

    try {
      item = await readNext();
    } catch (error: unknown) {
      fail(error as E);
      return;
    }

    if (item.done) {
      didFinishReading = true;
      return;
    }

    const runningTask = Promise.resolve()
      .then(async (): Promise<void> => {
        let result: SafeResult<Value, E>;

        try {
          result = await mapper(
            item.value as Item,
            item.index,
            controller.signal,
          );
        } catch (error: unknown) {
          result = [error as E, null];
        }

        if (result[0] !== null) {
          fail(result[0]);
          return;
        }

        values[item.index] = result[1] as Value;
      })
      .finally((): void => {
        running.delete(runningTask);
      });

    running.add(runningTask);
  };

  try {
    while (
      running.size < options.concurrency &&
      !didFinishReading &&
      !didFail &&
      !controller.signal.aborted
    ) {
      await startNext();
    }

    while (running.size > 0) {
      await Promise.race(running);

      if (didFail || controller.signal.aborted) {
        break;
      }

      while (
        running.size < options.concurrency &&
        !didFinishReading &&
        !didFail &&
        !controller.signal.aborted
      ) {
        await startNext();
      }
    }

    if (didFail) {
      await closeIterator();
      await Promise.allSettled(running);
      return [failure as E, null];
    }

    if (controller.signal.aborted) {
      await closeIterator();
      await Promise.allSettled(running);
      return [createAbortReason(controller.signal) as E, null];
    }

    return [null, values];
  } finally {
    cleanup();
  }
}
