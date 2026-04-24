import { describe, expect, it, vi } from "vitest";

import { singleFlight } from "yieldless/singleflight";

describe("yieldless/singleflight", () => {
  it("shares one in-flight operation for duplicate keys", async () => {
    const operation = vi.fn(async (_signal: AbortSignal, id: string) => {
      await new Promise((resolve) => {
        setTimeout(resolve, 5);
      });

      return [null, `repo:${id}`] as const;
    });
    const loadRepo = singleFlight(operation);

    const [first, second] = await Promise.all([
      loadRepo("yieldless"),
      loadRepo("yieldless"),
    ]);

    expect(first).toEqual([null, "repo:yieldless"]);
    expect(second).toEqual([null, "repo:yieldless"]);
    expect(operation).toHaveBeenCalledTimes(1);
    expect(loadRepo.size).toBe(0);
  });

  it("keeps different keys independent", async () => {
    const operation = vi.fn(async (_signal: AbortSignal, id: string) => [
      null,
      id,
    ] as const);
    const loadRepo = singleFlight(operation);

    await expect(
      Promise.all([loadRepo("a"), loadRepo("b")]),
    ).resolves.toEqual([
      [null, "a"],
      [null, "b"],
    ]);
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it("supports custom key functions", async () => {
    const operation = vi.fn(
      async (_signal: AbortSignal, request: { id: string; refresh: boolean }) =>
        [null, request.id] as const,
    );
    const loadRepo = singleFlight(operation, {
      getKey: (request) => request.id,
    });

    await Promise.all([
      loadRepo({ id: "same", refresh: false }),
      loadRepo({ id: "same", refresh: true }),
    ]);

    expect(operation).toHaveBeenCalledTimes(1);
  });

  it("normalizes thrown operation failures into tuple errors", async () => {
    const loadRepo = singleFlight(async () => {
      throw new Error("offline");
    });

    const [error, value] = await loadRepo();

    expect(value).toBeNull();
    expect(error).toBeInstanceOf(Error);
    expect(error?.message).toBe("offline");
  });

  it("aborts and removes a cleared in-flight entry", async () => {
    const loadRepo = singleFlight(async (signal: AbortSignal, id: string) => {
      await new Promise<void>((resolve) => {
        signal.addEventListener("abort", () => resolve(), { once: true });
      });

      return [signal.reason as Error, null] as const;
    });

    const running = loadRepo("yieldless");

    expect(loadRepo.has("yieldless")).toBe(true);
    loadRepo.clear("yieldless");

    const [error, value] = await running;

    expect(value).toBeNull();
    expect(error?.message).toBe("Single flight entry cleared.");
    expect(loadRepo.has("yieldless")).toBe(false);
  });

  it("inherits cancellation from a parent signal", async () => {
    const controller = new AbortController();
    const loadRepo = singleFlight(
      async (signal: AbortSignal) => {
        await new Promise<void>((resolve) => {
          signal.addEventListener("abort", () => resolve(), { once: true });
        });

        return [signal.reason as Error, null] as const;
      },
      {
        signal: controller.signal,
      },
    );

    const running = loadRepo();
    controller.abort(new Error("parent canceled"));

    const [error, value] = await running;

    expect(value).toBeNull();
    expect(error?.message).toBe("parent canceled");
  });
});
