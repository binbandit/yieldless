import { describe, expect, it } from "vitest";

import { poll, sleep, sleepSafe } from "yieldless/timer";
import { TimeoutError } from "yieldless/signal";

describe("yieldless/timer", () => {
  it("sleeps for a delay and supports zero-delay yields", async () => {
    await expect(sleep(0)).resolves.toBeUndefined();
    await expect(sleepSafe(0)).resolves.toEqual([null, undefined]);
  });

  it("rejects sleep with the abort reason", async () => {
    const controller = new AbortController();
    const running = sleep(1_000, { signal: controller.signal });
    const reason = new Error("stop waiting");

    controller.abort(reason);

    await expect(running).rejects.toBe(reason);
    await expect(sleepSafe(1_000, { signal: controller.signal })).resolves.toEqual([
      reason,
      null,
    ]);
  });

  it("polls until the operation returns a success tuple", async () => {
    const attempts: number[] = [];

    const result = await poll(
      async (attempt) => {
        attempts.push(attempt);

        return attempt < 3
          ? [new Error("not ready"), null] as const
          : [null, "ready"] as const;
      },
      {
        intervalMs: 0,
        maxAttempts: 5,
      },
    );

    expect(result).toEqual([null, "ready"]);
    expect(attempts).toEqual([1, 2, 3]);
  });

  it("stops polling when shouldContinue returns false", async () => {
    const result = await poll(
      async () => [new Error("fatal"), null] as const,
      {
        intervalMs: 0,
        shouldContinue: (error) => error.message !== "fatal",
      },
    );

    expect(result[0]?.message).toBe("fatal");
    expect(result[1]).toBeNull();
  });

  it("returns the last error when maxAttempts is reached", async () => {
    let attempts = 0;

    const result = await poll(
      async (attempt) => {
        attempts = attempt;
        return [new Error(`attempt ${String(attempt)}`), null] as const;
      },
      {
        intervalMs: 0,
        maxAttempts: 2,
      },
    );

    expect(result[0]?.message).toBe("attempt 2");
    expect(result[1]).toBeNull();
    expect(attempts).toBe(2);
  });

  it("returns a timeout error when the poll budget expires", async () => {
    const result = await poll(
      async () => [new Error("not ready"), null] as const,
      {
        intervalMs: 1_000,
        timeoutMs: 5,
      },
    );

    expect(result[0]).toBeInstanceOf(TimeoutError);
    expect(result[1]).toBeNull();
  });

  it("rejects invalid timer options", async () => {
    await expect(sleep(-1)).rejects.toThrow("delayMs cannot be negative.");
    await expect(
      poll(async () => [null, "never"] as const, {
        intervalMs: -1,
      }),
    ).rejects.toThrow("intervalMs cannot be negative.");
  });
});
