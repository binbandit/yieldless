import { describe, expect, it } from "vitest";

import { collect, forEach, mapAsyncLimit } from "yieldless/iterable";

async function* delayedItems(items: readonly number[]) {
  for (const item of items) {
    await Promise.resolve();
    yield item;
  }
}

describe("yieldless/iterable", () => {
  it("collects sync and async iterables into tuple arrays", async () => {
    await expect(collect([1, 2, 3])).resolves.toEqual([null, [1, 2, 3]]);
    await expect(collect(delayedItems([4, 5]))).resolves.toEqual([
      null,
      [4, 5],
    ]);
  });

  it("captures iterator failures while collecting", async () => {
    async function* broken() {
      yield 1;
      throw new Error("stream failed");
    }

    const [error, value] = await collect(broken());

    expect(value).toBeNull();
    expect(error?.message).toBe("stream failed");
  });

  it("runs tuple workers sequentially with forEach", async () => {
    const seen: string[] = [];

    const result = await forEach(["a", "b"], async (item, index) => {
      seen.push(`${String(index)}:${item}`);
      return [null, undefined] as const;
    });

    expect(result).toEqual([null, undefined]);
    expect(seen).toEqual(["0:a", "1:b"]);
  });

  it("stops forEach on the first worker error", async () => {
    const seen: number[] = [];

    const [error, value] = await forEach([1, 2, 3], async (item) => {
      seen.push(item);

      return item === 2
        ? [new Error("stop"), null] as const
        : [null, undefined] as const;
    });

    expect(value).toBeNull();
    expect(error?.message).toBe("stop");
    expect(seen).toEqual([1, 2]);
  });

  it("maps async iterables with bounded concurrency and stable order", async () => {
    let active = 0;
    let maxActive = 0;

    const result = await mapAsyncLimit(
      delayedItems([1, 2, 3, 4]),
      async (item, index) => {
        active += 1;
        maxActive = Math.max(maxActive, active);

        await new Promise((resolve) => {
          setTimeout(resolve, 5);
        });

        active -= 1;

        return [null, `${String(index)}:${String(item)}`] as const;
      },
      {
        concurrency: 2,
      },
    );

    expect(result).toEqual([null, ["0:1", "1:2", "2:3", "3:4"]]);
    expect(maxActive).toBe(2);
  });

  it("aborts in-flight iterable mapping on the first error", async () => {
    let siblingAborted = false;

    const [error, value] = await mapAsyncLimit(
      [1, 2, 3],
      async (item, _index, signal) => {
        if (item === 2) {
          return [new Error("map failed"), null] as const;
        }

        await new Promise<void>((resolve) => {
          signal.addEventListener(
            "abort",
            () => {
              siblingAborted = true;
              resolve();
            },
            { once: true },
          );
        });

        return [null, item] as const;
      },
      {
        concurrency: 2,
      },
    );

    expect(value).toBeNull();
    expect(error?.message).toBe("map failed");
    expect(siblingAborted).toBe(true);
  });

  it("rejects invalid concurrency values", async () => {
    await expect(
      mapAsyncLimit([1], async () => [null, 1] as const, { concurrency: 0 }),
    ).rejects.toThrow("concurrency must be a positive integer.");
  });
});
