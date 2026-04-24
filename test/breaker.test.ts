import { describe, expect, it } from "vitest";

import { CircuitOpenError, createCircuitBreaker } from "yieldless/breaker";

describe("yieldless/breaker", () => {
  it("opens after the failure threshold", async () => {
    const breaker = createCircuitBreaker(
      async () => [new Error("offline"), null] as const,
      {
        cooldownMs: 100,
        failureThreshold: 2,
      },
    );

    await breaker();
    await breaker();
    const [error, value] = await breaker();

    expect(value).toBeNull();
    expect(error).toBeInstanceOf(CircuitOpenError);
    expect(breaker.state).toBe("open");
  });

  it("moves through half-open and closes after success", async () => {
    let shouldFail = true;
    const breaker = createCircuitBreaker(
      async () =>
        shouldFail
          ? [new Error("offline"), null] as const
          : [null, "ok"] as const,
      {
        cooldownMs: 0,
        failureThreshold: 1,
      },
    );

    await breaker();
    shouldFail = false;

    await expect(breaker()).resolves.toEqual([null, "ok"]);
    expect(breaker.state).toBe("closed");
  });

  it("supports shouldTrip filters", async () => {
    const breaker = createCircuitBreaker(
      async () => [new Error("validation"), null] as const,
      {
        cooldownMs: 0,
        failureThreshold: 1,
        shouldTrip: (error) => error.message !== "validation",
      },
    );

    await breaker();

    expect(breaker.state).toBe("closed");
    expect(breaker.failureCount).toBe(0);
  });

  it("can be reset manually", async () => {
    const breaker = createCircuitBreaker(
      async () => [new Error("offline"), null] as const,
      {
        cooldownMs: 1_000,
        failureThreshold: 1,
      },
    );

    await breaker();
    breaker.reset();

    expect(breaker.state).toBe("closed");
    expect(breaker.failureCount).toBe(0);
  });
});
