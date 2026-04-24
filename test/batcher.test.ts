import { describe, expect, it, vi } from "vitest";

import { createBatcher, MissingBatchResultError } from "yieldless/batcher";

describe("yieldless/batcher", () => {
  it("batches nearby loads into one loadMany call", async () => {
    const loadMany = vi.fn(async (keys: readonly string[]) => [
      null,
      keys.map((key) => key.toUpperCase()),
    ] as const);
    const batcher = createBatcher({ loadMany, waitMs: 0 });

    await expect(
      Promise.all([batcher.load("a"), batcher.load("b")]),
    ).resolves.toEqual([
      [null, "A"],
      [null, "B"],
    ]);
    expect(loadMany).toHaveBeenCalledTimes(1);
    expect(loadMany.mock.calls[0]?.[0]).toEqual(["a", "b"]);
  });

  it("flushes early when maxBatchSize is reached", async () => {
    const loadMany = vi.fn(async (keys: readonly number[]) => [null, keys] as const);
    const batcher = createBatcher({ loadMany, maxBatchSize: 2, waitMs: 100 });

    await expect(Promise.all([batcher.load(1), batcher.load(2)])).resolves.toEqual([
      [null, 1],
      [null, 2],
    ]);
    expect(loadMany).toHaveBeenCalledTimes(1);
  });

  it("returns batch errors to every waiting load", async () => {
    const batcher = createBatcher<string, string>({
      loadMany: async () => [new Error("offline"), null],
    });

    const [first, second] = await Promise.all([
      batcher.load("a"),
      batcher.load("b"),
    ]);

    expect(first[0]?.message).toBe("offline");
    expect(second[0]?.message).toBe("offline");
  });

  it("reports missing values by index", async () => {
    const batcher = createBatcher<string, string>({
      loadMany: async () => [null, ["only-one"]],
    });

    const [, second] = await Promise.all([
      batcher.load("a"),
      batcher.load("b"),
    ]);

    expect(second[0]).toBeInstanceOf(MissingBatchResultError);
    expect(second[1]).toBeNull();
  });

  it("aborts pending loads before they flush", async () => {
    const batcher = createBatcher<string, string>({
      loadMany: async () => [null, ["never"]],
      waitMs: 1_000,
    });
    const controller = new AbortController();
    const pending = batcher.load("a", { signal: controller.signal });
    const reason = new Error("stop");

    controller.abort(reason);

    await expect(pending).resolves.toEqual([reason, null]);
    expect(batcher.pending).toBe(0);
  });
});
