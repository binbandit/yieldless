import { describe, expect, it } from "vitest";

import {
  composeSchedules,
  exponentialBackoff,
  fixedDelay,
  getScheduleDecision,
  maxAttempts,
  runScheduled,
  waitForSchedule,
} from "yieldless/schedule";

describe("yieldless/schedule", () => {
  it("combines timing and stop policies", () => {
    const policy = composeSchedules(
      fixedDelay(10),
      exponentialBackoff({ baseDelayMs: 5, jitter: "none" }),
      maxAttempts(3),
    );
    const controller = new AbortController();

    expect(
      getScheduleDecision(policy, {
        attempt: 1,
        elapsedMs: 0,
        signal: controller.signal,
      }),
    ).toEqual({ continue: true, delayMs: 10 });
    expect(
      getScheduleDecision(policy, {
        attempt: 3,
        elapsedMs: 0,
        signal: controller.signal,
      }),
    ).toEqual({ continue: false, delayMs: 0 });
  });

  it("waits with a policy and returns the previous error when it stops", async () => {
    const controller = new AbortController();
    const error = new Error("stop");

    await expect(
      waitForSchedule(maxAttempts(1), {
        attempt: 1,
        elapsedMs: 0,
        error,
        signal: controller.signal,
      }),
    ).resolves.toEqual([error, null]);
  });

  it("runs an operation until it succeeds", async () => {
    let attempts = 0;

    const result = await runScheduled(
      async () => {
        attempts += 1;

        return attempts < 3
          ? [new Error("not yet"), null] as const
          : [null, "done"] as const;
      },
      composeSchedules(fixedDelay(0), maxAttempts(4)),
    );

    expect(result).toEqual([null, "done"]);
    expect(attempts).toBe(3);
  });

  it("returns the last error when the schedule stops", async () => {
    const result = await runScheduled(
      async () => [new Error("still failing"), null] as const,
      maxAttempts(1),
    );

    expect(result[0]?.message).toBe("still failing");
    expect(result[1]).toBeNull();
  });

  it("validates schedule inputs", () => {
    expect(() => fixedDelay(-1)).toThrow("delayMs cannot be negative.");
    expect(() => maxAttempts(0)).toThrow("attempts must be a positive integer.");
  });
});
