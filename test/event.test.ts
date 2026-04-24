import { EventEmitter } from "node:events";

import { describe, expect, it } from "vitest";

import { onceEvent, onceEventSafe } from "yieldless/event";

describe("yieldless/event", () => {
  it("waits for one EventTarget event", async () => {
    const target = new EventTarget();
    const running = onceEvent<Event>(target, "ready");

    target.dispatchEvent(new Event("ready"));

    const event = await running;

    expect(event.type).toBe("ready");
  });

  it("waits for one EventEmitter event and normalizes payloads", async () => {
    const emitter = new EventEmitter();
    const onePayload = onceEvent<string>(emitter, "message");
    emitter.emit("message", "hello");

    await expect(onePayload).resolves.toBe("hello");

    const manyPayloads = onceEvent<readonly unknown[]>(emitter, "tuple");
    emitter.emit("tuple", "a", 2);

    await expect(manyPayloads).resolves.toEqual(["a", 2]);
  });

  it("rejects on EventEmitter error events by default", async () => {
    const emitter = new EventEmitter();
    const running = onceEvent(emitter, "ready");

    emitter.emit("error", new Error("offline"));

    await expect(running).rejects.toThrow("offline");
    expect(emitter.listenerCount("ready")).toBe(0);
    expect(emitter.listenerCount("error")).toBe(0);
  });

  it("can disable error-event rejection", async () => {
    const emitter = new EventEmitter();
    const running = onceEvent<string>(emitter, "error", {
      rejectOn: false,
    });

    emitter.emit("error", "domain-error");

    await expect(running).resolves.toBe("domain-error");
  });

  it("returns aborts as tuple errors through onceEventSafe", async () => {
    const target = new EventTarget();
    const controller = new AbortController();
    const running = onceEventSafe<Event>(target, "ready", {
      signal: controller.signal,
    });

    controller.abort(new Error("view closed"));

    const [error, event] = await running;

    expect(event).toBeNull();
    expect(error?.message).toBe("view closed");
  });
});
