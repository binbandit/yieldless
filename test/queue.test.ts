import { describe, expect, it } from "vitest";

import { createQueue, QueueClosedError } from "yieldless/queue";

describe("yieldless/queue", () => {
  it("offers and takes values in order", async () => {
    const queue = createQueue<number>();

    await expect(queue.offer(1)).resolves.toEqual([null, undefined]);
    await expect(queue.offer(2)).resolves.toEqual([null, undefined]);
    await expect(queue.take()).resolves.toEqual([null, 1]);
    await expect(queue.take()).resolves.toEqual([null, 2]);
  });

  it("applies backpressure when capacity is reached", async () => {
    const queue = createQueue<number>({ capacity: 1 });

    await queue.offer(1);
    const pending = queue.offer(2);

    expect(queue.pendingOffers).toBe(1);
    await expect(queue.take()).resolves.toEqual([null, 1]);
    await expect(pending).resolves.toEqual([null, undefined]);
    await expect(queue.take()).resolves.toEqual([null, 2]);
  });

  it("aborts pending takes", async () => {
    const queue = createQueue<string>();
    const controller = new AbortController();
    const pending = queue.take({ signal: controller.signal });
    const reason = new Error("stop");

    controller.abort(reason);

    await expect(pending).resolves.toEqual([reason, null]);
    expect(queue.pendingTakes).toBe(0);
  });

  it("closes pending and future operations", async () => {
    const queue = createQueue<string>();
    const pending = queue.take();
    const reason = new QueueClosedError("done");

    queue.close(reason);

    await expect(pending).resolves.toEqual([reason, null]);
    await expect(queue.offer("late")).resolves.toEqual([reason, null]);
    await expect(queue.take()).resolves.toEqual([reason, null]);
  });

  it("supports async iteration until the queue closes", async () => {
    const queue = createQueue<number>();
    const seen: number[] = [];
    const running = (async (): Promise<void> => {
      for await (const item of queue) {
        seen.push(item);
      }
    })();

    await queue.offer(1);
    await queue.offer(2);
    queue.close();
    await running;

    expect(seen).toEqual([1, 2]);
  });
});
