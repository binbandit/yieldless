import type { SafeResult } from "yieldless/error";

export interface BatcherOptions<Key, Value, E = Error> {
  readonly loadMany: (
    keys: readonly Key[],
    signal: AbortSignal,
  ) => PromiseLike<SafeResult<readonly Value[], E>> | SafeResult<readonly Value[], E>;
  readonly maxBatchSize?: number;
  readonly waitMs?: number;
}

export interface BatcherLoadOptions {
  readonly signal?: AbortSignal;
}

export interface Batcher<Key, Value, E = Error> {
  readonly pending: number;
  clear(reason?: E): void;
  load(key: Key, options?: BatcherLoadOptions): Promise<SafeResult<Value, E>>;
}

export class MissingBatchResultError extends Error {
  constructor(index: number) {
    super(`Batch loader did not return a value for index ${String(index)}.`);
    this.name = "MissingBatchResultError";
  }
}

interface PendingItem<Key, Value, E> {
  readonly key: Key;
  readonly resolve: (result: SafeResult<Value, E>) => void;
  readonly signal: AbortSignal | undefined;
  readonly onAbort: (() => void) | undefined;
}

function createAbortReason(signal: AbortSignal): unknown {
  if ("reason" in signal && signal.reason !== undefined) {
    return signal.reason;
  }

  return new DOMException("This operation was aborted.", "AbortError");
}

function validateOptions(maxBatchSize: number, waitMs: number): void {
  if (!Number.isInteger(maxBatchSize) || maxBatchSize < 1) {
    throw new RangeError("maxBatchSize must be a positive integer.");
  }

  if (!Number.isFinite(waitMs) || waitMs < 0) {
    throw new RangeError("waitMs cannot be negative.");
  }
}

function cleanupPendingItem<Key, Value, E>(
  item: PendingItem<Key, Value, E>,
): void {
  if (item.signal !== undefined && item.onAbort !== undefined) {
    item.signal.removeEventListener("abort", item.onAbort);
  }
}

export function createBatcher<Key, Value, E = Error>(
  options: BatcherOptions<Key, Value, E>,
): Batcher<Key, Value, E> {
  const maxBatchSize = options.maxBatchSize ?? Number.MAX_SAFE_INTEGER;
  const waitMs = options.waitMs ?? 0;
  const pending: PendingItem<Key, Value, E>[] = [];
  let timer: ReturnType<typeof setTimeout> | null = null;

  validateOptions(maxBatchSize, waitMs);

  const removePending = (item: PendingItem<Key, Value, E>): void => {
    const index = pending.indexOf(item);

    if (index >= 0) {
      pending.splice(index, 1);
    }
  };

  const flush = (): void => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }

    const batch = pending.splice(0, maxBatchSize);

    if (pending.length > 0) {
      scheduleFlush();
    }

    if (batch.length === 0) {
      return;
    }

    const controller = new AbortController();
    const keys = batch.map((item) => item.key);

    void Promise.resolve()
      .then(async (): Promise<SafeResult<readonly Value[], E>> => {
        try {
          return await options.loadMany(keys, controller.signal);
        } catch (error: unknown) {
          return [error as E, null];
        }
      })
      .then((result): void => {
        if (result[0] !== null) {
          for (const item of batch) {
            cleanupPendingItem(item);
            item.resolve([result[0], null]);
          }

          return;
        }

        const values = result[1] as readonly Value[];

        for (const [index, item] of batch.entries()) {
          cleanupPendingItem(item);

          if (index >= values.length) {
            item.resolve([new MissingBatchResultError(index) as E, null]);
            continue;
          }

          item.resolve([null, values[index] as Value]);
        }
      });
  };

  function scheduleFlush(): void {
    if (timer !== null) {
      return;
    }

    timer = setTimeout(flush, waitMs);
  }

  return {
    get pending(): number {
      return pending.length;
    },
    clear(reason: E = new Error("Batcher cleared.") as E): void {
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }

      const items = pending.splice(0);

      for (const item of items) {
        cleanupPendingItem(item);
        item.resolve([reason, null]);
      }
    },
    async load(
      key: Key,
      loadOptions: BatcherLoadOptions = {},
    ): Promise<SafeResult<Value, E>> {
      if (loadOptions.signal?.aborted) {
        return [createAbortReason(loadOptions.signal) as E, null];
      }

      return await new Promise<SafeResult<Value, E>>((resolve): void => {
        let item: PendingItem<Key, Value, E>;
        const onAbort = (): void => {
          removePending(item);
          resolve([
            loadOptions.signal === undefined
              ? undefined as E
              : createAbortReason(loadOptions.signal) as E,
            null,
          ]);
        };

        item = {
          key,
          onAbort,
          resolve,
          signal: loadOptions.signal,
        };

        loadOptions.signal?.addEventListener("abort", onAbort, { once: true });
        pending.push(item);

        if (pending.length >= maxBatchSize) {
          flush();
          return;
        }

        scheduleFlush();
      });
    },
  };
}
