import { describe, expect, it, vi } from "vitest";

import { safeRetry } from "yieldless/retry";

describe("yieldless/retry", () => {
  it("returns the first successful result", async () => {
    let attempts = 0;

    const result = await safeRetry(
      async () => {
        attempts += 1;

        if (attempts < 3) {
          return [new Error(`attempt-${attempts}`), null];
        }

        return [null, "ok"];
      },
      {
        baseDelayMs: 1,
        jitter: "none",
        maxAttempts: 4,
      },
    );

    expect(attempts).toBe(3);
    expect(result).toEqual([null, "ok"]);
  });

  it("stops waiting when the parent signal aborts", async () => {
    const controller = new AbortController();

    const running = safeRetry(
      async () => [new Error("temporary"), null],
      {
        signal: controller.signal,
        baseDelayMs: 1_000,
        jitter: "none",
        maxAttempts: 10,
      },
    );

    setTimeout(() => {
      controller.abort(new Error("stop"));
    }, 20);

    await expect(running).resolves.toEqual([expect.any(Error), null]);
    const [error] = await running;
    expect(error?.message).toBe("stop");
  });

  it("respects shouldRetry when an error should stop immediately", async () => {
    const shouldRetry = vi.fn(() => false);

    const result = await safeRetry(
      async () => [new Error("nope"), null],
      {
        shouldRetry,
      },
    );

    expect(shouldRetry).toHaveBeenCalledTimes(1);
    expect(result[0]).toBeInstanceOf(Error);
    expect(result[1]).toBeNull();
  });

  it("reports retry state through onRetry", async () => {
    const seen: { attempt: number; delayMs: number; message: string }[] = [];

    const result = await safeRetry(
      async (attempt) =>
        attempt < 2 ? [new Error("temporary"), null] : [null, "done"],
      {
        baseDelayMs: 2,
        jitter: "none",
        onRetry(state) {
          seen.push({
            attempt: state.attempt,
            delayMs: state.delayMs,
            message: state.error.message,
          });
        },
      },
    );

    expect(result).toEqual([null, "done"]);
    expect(seen).toEqual([{ attempt: 1, delayMs: 2, message: "temporary" }]);
  });
});
