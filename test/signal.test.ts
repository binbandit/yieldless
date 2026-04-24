import { describe, expect, it, vi } from "vitest";

import { createTimeoutSignal, TimeoutError, withTimeout } from "yieldless/signal";

describe("yieldless/signal", () => {
  it("aborts an operation when the timeout expires", async () => {
    const running = withTimeout(
      async (signal) =>
        await new Promise((_, reject) => {
          signal.addEventListener(
            "abort",
            () => reject(signal.reason),
            { once: true },
          );
        }),
      { timeoutMs: 20 },
    );

    await expect(running).rejects.toBeInstanceOf(TimeoutError);
  });

  it("uses the parent signal when it aborts before the timeout", async () => {
    const controller = new AbortController();
    const running = withTimeout(
      async (signal) =>
        await new Promise((_, reject) => {
          signal.addEventListener(
            "abort",
            () => reject(signal.reason),
            { once: true },
          );
        }),
      {
        timeoutMs: 1_000,
        signal: controller.signal,
      },
    );

    setTimeout(() => {
      controller.abort(new Error("request canceled"));
    }, 20);

    await expect(running).rejects.toThrow("request canceled");
  });

  it("clears the timeout when the scope is disposed early", async () => {
    const timeout = createTimeoutSignal(20);
    const signal = timeout.signal;

    timeout[Symbol.dispose]();

    await new Promise((resolve) => {
      setTimeout(resolve, 50);
    });

    expect(signal.aborted).toBe(false);
  });

  it("does not schedule a timer when the parent signal is already aborted", () => {
    vi.useFakeTimers();

    try {
      const controller = new AbortController();
      controller.abort(new Error("already canceled"));

      const timeout = createTimeoutSignal(1_000, {
        signal: controller.signal,
      });

      expect(timeout.signal.aborted).toBe(true);
      expect(timeout.signal.reason).toBe(controller.signal.reason);
      expect(vi.getTimerCount()).toBe(0);

      timeout[Symbol.dispose]();
    } finally {
      vi.useRealTimers();
    }
  });

  it("rejects invalid timeout values", () => {
    expect(() => createTimeoutSignal(-1)).toThrow("timeoutMs cannot be negative.");
  });
});
