import { describe, expect, it } from "vitest";

import {
  createManualClock,
  createTestSignal,
  deferred,
  flushMicrotasks,
} from "yieldless/test";

describe("yieldless/test", () => {
  it("creates deferred promises", async () => {
    const value = deferred<string>();

    value.resolve("done");

    await expect(value.promise).resolves.toBe("done");
  });

  it("flushes microtasks", async () => {
    let ready = false;

    void Promise.resolve().then(() => {
      ready = true;
    });

    await flushMicrotasks();

    expect(ready).toBe(true);
  });

  it("creates a controllable abort signal", () => {
    const testSignal = createTestSignal();
    const reason = new Error("stop");

    testSignal.abort(reason);

    expect(testSignal.signal.aborted).toBe(true);
    expect(testSignal.signal.reason).toBe(reason);
  });

  it("advances manual clock sleeps", async () => {
    const clock = createManualClock();
    let done = false;
    const sleeping = clock.sleep(10).then(() => {
      done = true;
    });

    clock.tick(5);
    await flushMicrotasks();
    expect(done).toBe(false);
    clock.tick(5);
    await sleeping;

    expect(done).toBe(true);
    expect(clock.now).toBe(10);
  });

  it("aborts manual clock sleeps", async () => {
    const clock = createManualClock();
    const controller = new AbortController();
    const sleeping = clock.sleep(10, { signal: controller.signal });
    const reason = new Error("stop");

    controller.abort(reason);

    await expect(sleeping).rejects.toBe(reason);
    expect(clock.pending).toBe(0);
  });
});
