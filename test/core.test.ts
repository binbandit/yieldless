import { describe, expect, it } from "vitest";

import { inject } from "yieldless/di";
import { err, match, ok, safeTry, safeTrySync, unwrap } from "yieldless/error";
import { acquireResource } from "yieldless/resource";

describe("yieldless/error", () => {
  it("returns a success tuple for resolved promises", async () => {
    await expect(safeTry(Promise.resolve("ok"))).resolves.toEqual([null, "ok"]);
  });

  it("captures thrown values without wrapping them", async () => {
    await expect(safeTry(Promise.reject("boom"))).resolves.toEqual(["boom", null]);
  });

  it("captures synchronous failures", () => {
    expect(
      safeTrySync(() => {
        throw new Error("sync");
      }),
    ).toEqual([expect.any(Error), null]);
  });

  it("unwrap returns successful values and rethrows failures", () => {
    expect(unwrap([null, 42])).toBe(42);
    expect(() => unwrap([new Error("broken"), null])).toThrow("broken");
  });

  it("ok and err make tuple construction explicit", () => {
    expect(ok("ready")).toEqual([null, "ready"]);
    expect(err("boom")).toEqual(["boom", null]);
  });

  it("match folds a tuple into renderer-friendly state", () => {
    const ready = match(ok({ id: 7 }), {
      ok: (value) => ({ kind: "ready" as const, value }),
      err: (error) => ({ kind: "error" as const, message: String(error) }),
    });
    const failed = match(err(new Error("offline")), {
      ok: (value) => ({ kind: "ready" as const, value }),
      err: (error) => ({ kind: "error" as const, message: error.message }),
    });

    expect(ready).toEqual({
      kind: "ready",
      value: { id: 7 },
    });
    expect(failed).toEqual({
      kind: "error",
      message: "offline",
    });
  });
});

describe("yieldless/di", () => {
  it("binds dependencies at the application edge", () => {
    const handler = inject(
      (deps: { prefix: string }, value: string) => `${deps.prefix}:${value}`,
      { prefix: "yieldless" },
    );

    expect(handler("ok")).toBe("yieldless:ok");
  });
});

describe("yieldless/resource", () => {
  it("releases an acquired resource once", async () => {
    const released: string[] = [];
    const resource = await acquireResource(
      async () => ({ id: "db" }),
      async (value) => {
        released.push(value.id);
      },
    );

    expect(resource.value.id).toBe("db");

    await resource[Symbol.asyncDispose]();
    await resource[Symbol.asyncDispose]();

    expect(released).toEqual(["db"]);
  });
});
