import { describe, expect, it } from "vitest";

import { err, ok } from "yieldless/error";
import {
  andThen,
  andThenAsync,
  fromNullable,
  isErr,
  isOk,
  mapErr,
  mapErrAsync,
  mapOk,
  mapOkAsync,
  tapErr,
  tapErrAsync,
  tapOk,
  tapOkAsync,
  toPromise,
} from "yieldless/result";

describe("yieldless/result", () => {
  it("narrows tuple state with isOk and isErr", () => {
    expect(isOk(ok("ready"))).toBe(true);
    expect(isErr(ok("ready"))).toBe(false);
    expect(isOk(err(new Error("broken")))).toBe(false);
    expect(isErr(err(new Error("broken")))).toBe(true);
  });

  it("turns nullish values into explicit errors", () => {
    expect(fromNullable("value", () => new Error("missing"))).toEqual([
      null,
      "value",
    ]);

    const [error, value] = fromNullable(undefined, () => new Error("missing"));

    expect(error?.message).toBe("missing");
    expect(value).toBeNull();
  });

  it("maps success and error branches without touching the opposite branch", () => {
    expect(mapOk(ok(2), (value) => value * 2)).toEqual([null, 4]);
    expect(mapOk(err("nope"), (value: number) => value * 2)).toEqual([
      "nope",
      null,
    ]);

    expect(mapErr(err("nope"), (error) => new Error(error))[0]).toBeInstanceOf(
      Error,
    );
    expect(mapErr(ok("steady"), () => new Error("unused"))).toEqual([
      null,
      "steady",
    ]);
  });

  it("supports async maps for tuple pipelines", async () => {
    await expect(mapOkAsync(ok(2), async (value) => value * 3)).resolves.toEqual([
      null,
      6,
    ]);
    await expect(
      mapErrAsync(err("offline"), async (error) => error.toUpperCase()),
    ).resolves.toEqual(["OFFLINE", null]);
  });

  it("chains tuple-producing work", async () => {
    expect(
      andThen(ok("42"), (value) => ok(Number.parseInt(value, 10))),
    ).toEqual([null, 42]);
    expect(andThen(err("bad"), () => ok("unused"))).toEqual(["bad", null]);

    await expect(
      andThenAsync(ok("yieldless"), async (value) => ok(value.length)),
    ).resolves.toEqual([null, 9]);
  });

  it("taps success and error branches for side effects", async () => {
    const events: string[] = [];

    expect(tapOk(ok("loaded"), (value) => events.push(value))).toEqual([
      null,
      "loaded",
    ]);
    expect(tapErr(err("failed"), (error) => events.push(error))).toEqual([
      "failed",
      null,
    ]);

    await expect(
      tapOkAsync(ok("cached"), async (value) => events.push(value)),
    ).resolves.toEqual([null, "cached"]);
    await expect(
      tapErrAsync(err("missing"), async (error) => events.push(error)),
    ).resolves.toEqual(["missing", null]);

    expect(events).toEqual(["loaded", "failed", "cached", "missing"]);
  });

  it("converts a tuple back to promise form at framework boundaries", async () => {
    await expect(toPromise(ok("ready"))).resolves.toBe("ready");
    await expect(toPromise(err(new Error("broken")))).rejects.toThrow("broken");
  });
});
