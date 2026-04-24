import type { SafeResult } from "yieldless/error";

export interface CacheOptions<Key, Value, E = Error> {
  readonly getKey?: (key: Key) => string;
  readonly load: (key: Key, signal: AbortSignal) => PromiseLike<SafeResult<Value, E>> | SafeResult<Value, E>;
  readonly maxSize?: number;
  readonly ttlMs?: number;
}

export interface CacheGetOptions {
  readonly signal?: AbortSignal;
}

export interface CacheStats {
  readonly hits: number;
  readonly inFlight: number;
  readonly misses: number;
  readonly size: number;
}

export interface Cache<Key, Value, E = Error> {
  readonly size: number;
  clear(): void;
  delete(key: Key): boolean;
  get(key: Key, options?: CacheGetOptions): Promise<SafeResult<Value, E>>;
  has(key: Key): boolean;
  refresh(key: Key, options?: CacheGetOptions): Promise<SafeResult<Value, E>>;
  stats(): CacheStats;
}

interface CacheEntry<Value> {
  readonly expiresAt: number;
  readonly value: Value;
}

interface InFlight<Value, E> {
  readonly controller: AbortController;
  readonly promise: Promise<SafeResult<Value, E>>;
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

function validateOptions(maxSize: number, ttlMs: number): void {
  if (!Number.isInteger(maxSize) || maxSize < 1) {
    throw new RangeError("maxSize must be a positive integer.");
  }

  if (ttlMs !== Number.POSITIVE_INFINITY && (!Number.isFinite(ttlMs) || ttlMs < 0)) {
    throw new RangeError("ttlMs cannot be negative.");
  }
}

function defaultGetKey(key: unknown): string {
  return typeof key === "string" ? key : JSON.stringify(key);
}

export function createCache<Key, Value, E = Error>(
  options: CacheOptions<Key, Value, E>,
): Cache<Key, Value, E> {
  const maxSize = options.maxSize ?? Number.MAX_SAFE_INTEGER;
  const ttlMs = options.ttlMs ?? Number.POSITIVE_INFINITY;
  const getKey = options.getKey ?? defaultGetKey;
  const entries = new Map<string, CacheEntry<Value>>();
  const inFlight = new Map<string, InFlight<Value, E>>();
  let hits = 0;
  let misses = 0;

  validateOptions(maxSize, ttlMs);

  const getFreshEntry = (key: string): CacheEntry<Value> | undefined => {
    const entry = entries.get(key);

    if (entry === undefined) {
      return undefined;
    }

    if (entry.expiresAt <= Date.now()) {
      entries.delete(key);
      return undefined;
    }

    entries.delete(key);
    entries.set(key, entry);

    return entry;
  };

  const store = (key: string, value: Value): void => {
    entries.set(key, {
      expiresAt: ttlMs === Number.POSITIVE_INFINITY
        ? Number.POSITIVE_INFINITY
        : Date.now() + ttlMs,
      value,
    });

    while (entries.size > maxSize) {
      const oldest = entries.keys().next().value as string | undefined;

      if (oldest === undefined) {
        return;
      }

      entries.delete(oldest);
    }
  };

  const loadFresh = (
    originalKey: Key,
    key: string,
    signal: AbortSignal | undefined,
  ): Promise<SafeResult<Value, E>> => {
    const existing = inFlight.get(key);

    if (existing !== undefined) {
      return existing.promise;
    }

    const controller = new AbortController();
    const cleanup = linkAbortSignal(signal, controller);
    const promise = Promise.resolve()
      .then(async (): Promise<SafeResult<Value, E>> => {
        if (controller.signal.aborted) {
          return [createAbortReason(controller.signal) as E, null];
        }

        try {
          const result = await options.load(originalKey, controller.signal);

          if (result[0] === null) {
            store(key, result[1] as Value);
          }

          return result;
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

  return {
    get size(): number {
      return entries.size;
    },
    clear(): void {
      entries.clear();

      for (const entry of inFlight.values()) {
        entry.controller.abort(new Error("Cache cleared."));
      }

      inFlight.clear();
    },
    delete(key: Key): boolean {
      const cacheKey = getKey(key);
      const deleted = entries.delete(cacheKey);
      const running = inFlight.get(cacheKey);

      if (running !== undefined) {
        running.controller.abort(new Error("Cache entry deleted."));
        inFlight.delete(cacheKey);
      }

      return deleted || running !== undefined;
    },
    async get(
      key: Key,
      getOptions: CacheGetOptions = {},
    ): Promise<SafeResult<Value, E>> {
      const cacheKey = getKey(key);
      const entry = getFreshEntry(cacheKey);

      if (entry !== undefined) {
        hits += 1;
        return [null, entry.value];
      }

      misses += 1;

      return await loadFresh(key, cacheKey, getOptions.signal);
    },
    has(key: Key): boolean {
      return getFreshEntry(getKey(key)) !== undefined;
    },
    async refresh(
      key: Key,
      getOptions: CacheGetOptions = {},
    ): Promise<SafeResult<Value, E>> {
      const cacheKey = getKey(key);

      entries.delete(cacheKey);
      misses += 1;

      return await loadFresh(key, cacheKey, getOptions.signal);
    },
    stats(): CacheStats {
      return {
        hits,
        inFlight: inFlight.size,
        misses,
        size: entries.size,
      };
    },
  };
}
