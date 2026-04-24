import { describe, expect, it } from "vitest";

import { createRateLimiter, createSemaphore, withPermit } from "yieldless/limiter";

describe("yieldless/limiter", () => {
  it("limits semaphore concurrency and releases permits", async () => {
    const semaphore = createSemaphore(2);
    let active = 0;
    let maxActive = 0;

    await Promise.all(
      [1, 2, 3, 4].map((item) =>
        semaphore.withPermit(async () => {
          active += 1;
          maxActive = Math.max(maxActive, active);
          await new Promise((resolve) => {
            setTimeout(resolve, 5);
          });
          active -= 1;

          return item;
        }),
      ),
    );

    expect(maxActive).toBe(2);
    expect(semaphore.available).toBe(2);
  });

  it("wraps permit failures in tuple form", async () => {
    const semaphore = createSemaphore(1);

    const [error, value] = await withPermit(semaphore, async () => {
      throw new Error("boom");
    });

    expect(value).toBeNull();
    expect(error?.message).toBe("boom");
    expect(semaphore.available).toBe(1);
  });

  it("aborts pending semaphore acquisition", async () => {
    const semaphore = createSemaphore(1);
    const permit = await semaphore.acquire();
    const controller = new AbortController();
    const pending = semaphore.acquire({ signal: controller.signal });
    const reason = new Error("stop");

    controller.abort(reason);

    await expect(pending).rejects.toBe(reason);
    permit.release();
    expect(semaphore.pending).toBe(0);
  });

  it("paces work through a rate limiter", async () => {
    const limiter = createRateLimiter({ intervalMs: 5, limit: 2 });
    const startedAt = Date.now();

    await Promise.all([
      limiter.take(),
      limiter.take(),
      limiter.take(),
    ]);

    expect(Date.now() - startedAt).toBeGreaterThanOrEqual(4);
  });

  it("clears pending rate limiter waiters", async () => {
    const limiter = createRateLimiter({ intervalMs: 1_000, limit: 1 });
    const first = limiter.take();
    const second = limiter.takeSafe();

    await first;
    limiter.clear(new Error("closed"));

    const [error, value] = await second;

    expect(value).toBeNull();
    expect(error?.message).toBe("closed");
  });
});
