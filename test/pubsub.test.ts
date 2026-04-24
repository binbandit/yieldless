import { describe, expect, it } from "vitest";

import { createPubSub } from "yieldless/pubsub";

describe("yieldless/pubsub", () => {
  it("publishes values to every subscriber", async () => {
    const bus = createPubSub<string>();
    const first = bus.subscribe();
    const second = bus.subscribe();

    expect(bus.publish("ready")).toBe(2);

    await expect(first.next()).resolves.toEqual({
      done: false,
      value: "ready",
    });
    await expect(second.next()).resolves.toEqual({
      done: false,
      value: "ready",
    });
  });

  it("replays recent values to new subscribers", async () => {
    const bus = createPubSub<number>({ replay: 2 });

    bus.publish(1);
    bus.publish(2);
    bus.publish(3);

    const subscription = bus.subscribe();

    await expect(subscription.next()).resolves.toEqual({
      done: false,
      value: 2,
    });
    await expect(subscription.next()).resolves.toEqual({
      done: false,
      value: 3,
    });
  });

  it("removes subscriptions when they close", () => {
    const bus = createPubSub<string>();
    const subscription = bus.subscribe();

    expect(bus.subscriberCount).toBe(1);
    subscription.close();
    expect(bus.subscriberCount).toBe(0);
  });

  it("ends subscribers when the pubsub closes", async () => {
    const bus = createPubSub<string>();
    const subscription = bus.subscribe();

    bus.close();

    await expect(subscription.next()).resolves.toEqual({
      done: true,
      value: undefined,
    });
    expect(bus.publish("late")).toBe(0);
  });
});
