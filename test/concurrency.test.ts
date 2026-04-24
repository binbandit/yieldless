import { describe, expect, it, vi } from "vitest";

import { all, mapLimit, race } from "yieldless/all";
import { runTaskGroup } from "yieldless/task";

describe("yieldless/all", () => {
  it("returns successful values in task order", async () => {
    await expect(
      all([
        async () => [null, "first"] as const,
        async () => [null, "second"] as const,
      ]),
    ).resolves.toEqual([null, ["first", "second"]]);
  });

  it("aborts sibling tasks on the first tuple error", async () => {
    let siblingAborted = false;

    const result = await all([
      async (signal) => {
        await new Promise((resolve, reject) => {
          const timer = setTimeout(resolve, 1_000);

          signal.addEventListener(
            "abort",
            () => {
              siblingAborted = true;
              clearTimeout(timer);
              reject(signal.reason);
            },
            { once: true },
          );
        });

        return [null, "late"] as const;
      },
      async () => [new Error("boom"), null] as const,
    ]);

    expect(result[0]).toBeInstanceOf(Error);
    expect(result[0]?.message).toBe("boom");
    expect(result[1]).toBeNull();
    expect(siblingAborted).toBe(true);
  });
});

describe("yieldless/mapLimit", () => {
  it("maps items with a concurrency ceiling and preserves input order", async () => {
    let active = 0;
    let maxActive = 0;

    const result = await mapLimit(
      [1, 2, 3, 4],
      async (value, index) => {
        active += 1;
        maxActive = Math.max(maxActive, active);

        await new Promise((resolve) => {
          setTimeout(resolve, 5);
        });

        active -= 1;

        return [null, `${index}:${value}`] as const;
      },
      { concurrency: 2 },
    );

    expect(result).toEqual([null, ["0:1", "1:2", "2:3", "3:4"]]);
    expect(maxActive).toBe(2);
  });

  it("aborts in-flight work and stops starting new items on the first error", async () => {
    const started: number[] = [];
    let siblingAborted = false;

    const result = await mapLimit(
      [1, 2, 3, 4],
      async (value, _index, signal) => {
        started.push(value);

        if (value === 2) {
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

        return [null, value] as const;
      },
      { concurrency: 2 },
    );

    expect(result[0]).toBeInstanceOf(Error);
    expect(result[0]?.message).toBe("map failed");
    expect(result[1]).toBeNull();
    expect(siblingAborted).toBe(true);
    expect(started).toEqual([1, 2]);
  });

  it("does not start work when the parent signal is already aborted", async () => {
    const controller = new AbortController();
    const mapper = vi.fn(async () => [null, "never"] as const);

    controller.abort(new Error("parent canceled"));

    const result = await mapLimit(["repo"], mapper, {
      concurrency: 1,
      signal: controller.signal,
    });

    expect(result[0]).toBeInstanceOf(Error);
    expect(result[0]?.message).toBe("parent canceled");
    expect(result[1]).toBeNull();
    expect(mapper).not.toHaveBeenCalled();
  });

  it("rejects invalid concurrency values", async () => {
    await expect(
      mapLimit([1], async () => [null, 1] as const, { concurrency: 0 }),
    ).rejects.toThrow("concurrency must be a positive integer.");
  });
});

describe("yieldless/race", () => {
  it("returns the first successful tuple and aborts the rest", async () => {
    let siblingAborted = false;

    const result = await race([
      async (signal) => {
        await new Promise((resolve, reject) => {
          const timer = setTimeout(resolve, 1_000);

          signal.addEventListener(
            "abort",
            () => {
              siblingAborted = true;
              clearTimeout(timer);
              reject(signal.reason);
            },
            { once: true },
          );
        });

        return [null, "slow"] as const;
      },
      async () => [null, "fast"] as const,
    ]);

    expect(result).toEqual([null, "fast"]);
    expect(siblingAborted).toBe(true);
  });

  it("throws when called without tasks", async () => {
    await expect(race([])).rejects.toThrow("race requires at least one task.");
  });
});

describe("yieldless/task", () => {
  it("waits for spawned tasks before resolving", async () => {
    const events: string[] = [];

    const result = await runTaskGroup(async (group) => {
      void group.spawn(async () => {
        await new Promise((resolve) => {
          setTimeout(resolve, 10);
        });
        events.push("child");
      });

      events.push("body");
      return "done";
    });

    expect(result).toBe("done");
    expect(events).toEqual(["body", "child"]);
  });

  it("rethrows the first child failure after aborting the group", async () => {
    let siblingAborted = false;

    await expect(
      runTaskGroup(async (group) => {
        void group.spawn(async (signal) => {
          await new Promise((resolve, reject) => {
            const timer = setTimeout(resolve, 1_000);

            signal.addEventListener(
              "abort",
              () => {
                siblingAborted = true;
                clearTimeout(timer);
                reject(signal.reason);
              },
              { once: true },
            );
          });
        });

        await group.spawn(async () => {
          throw new Error("child failure");
        });

        return "never";
      }),
    ).rejects.toThrow("child failure");

    expect(siblingAborted).toBe(true);
  });

  it("inherits cancellation from an upstream AbortSignal", async () => {
    const controller = new AbortController();
    let childAborted = false;

    const running = runTaskGroup(
      async (group, signal) => {
        void group.spawn(async (childSignal) => {
          await new Promise((_, reject) => {
            childSignal.addEventListener(
              "abort",
              () => {
                childAborted = true;
                reject(childSignal.reason);
              },
              { once: true },
            );
          });
        });

        await new Promise((_, reject) => {
          signal.addEventListener("abort", () => reject(signal.reason), {
            once: true,
          });
        });

        return "never";
      },
      { signal: controller.signal },
    );

    setTimeout(() => {
      controller.abort(new Error("parent canceled"));
    }, 20);

    await expect(running).rejects.toThrow("parent canceled");
    expect(childAborted).toBe(true);
  });

  it("does not enter the task group body when the upstream signal is already aborted", async () => {
    const controller = new AbortController();
    const operation = vi.fn(async () => "never");

    controller.abort(new Error("already canceled"));

    await expect(
      runTaskGroup(operation, { signal: controller.signal }),
    ).rejects.toThrow("already canceled");
    expect(operation).not.toHaveBeenCalled();
  });
});
