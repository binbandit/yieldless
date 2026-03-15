import { describe, expect, it } from "vitest";

import { all, race } from "yieldless/all";
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
});
