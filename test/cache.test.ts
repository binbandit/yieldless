import { describe, expect, it, vi } from "vitest";

import { createCache } from "yieldless/cache";

describe("yieldless/cache", () => {
  it("loads once and returns cached values", async () => {
    const load = vi.fn(async (_key: string, _signal: AbortSignal) => [
      null,
      "value",
    ] as const);
    const cache = createCache({ load });

    await expect(cache.get("a")).resolves.toEqual([null, "value"]);
    await expect(cache.get("a")).resolves.toEqual([null, "value"]);
    expect(load).toHaveBeenCalledTimes(1);
    expect(cache.stats()).toMatchObject({ hits: 1, misses: 1, size: 1 });
  });

  it("deduplicates concurrent loads", async () => {
    const load = vi.fn(async (key: string) => {
      await new Promise((resolve) => {
        setTimeout(resolve, 5);
      });

      return [null, key.toUpperCase()] as const;
    });
    const cache = createCache({ load });

    await expect(Promise.all([cache.get("a"), cache.get("a")])).resolves.toEqual([
      [null, "A"],
      [null, "A"],
    ]);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("expires values by ttl", async () => {
    let version = 0;
    const cache = createCache({
      load: async () => {
        version += 1;
        return [null, version] as const;
      },
      ttlMs: 1,
    });

    await expect(cache.get("a")).resolves.toEqual([null, 1]);
    await new Promise((resolve) => {
      setTimeout(resolve, 5);
    });
    await expect(cache.get("a")).resolves.toEqual([null, 2]);
  });

  it("evicts least recently used values", async () => {
    const cache = createCache({
      load: async (key: string) => [null, key] as const,
      maxSize: 2,
    });

    await cache.get("a");
    await cache.get("b");
    await cache.get("a");
    await cache.get("c");

    expect(cache.has("a")).toBe(true);
    expect(cache.has("b")).toBe(false);
    expect(cache.has("c")).toBe(true);
  });

  it("aborts deleted in-flight entries", async () => {
    const cache = createCache({
      load: async (_key: string, signal: AbortSignal) => {
        await new Promise<void>((resolve) => {
          signal.addEventListener("abort", () => resolve(), { once: true });
        });

        return [signal.reason as Error, null] as const;
      },
    });

    const running = cache.get("a");

    expect(cache.delete("a")).toBe(true);
    const [error, value] = await running;

    expect(value).toBeNull();
    expect(error?.message).toBe("Cache entry deleted.");
  });
});
