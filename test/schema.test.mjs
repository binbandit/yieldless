import assert from "node:assert/strict";
import test from "node:test";

import { parseAsyncSafe, parseSafe } from "yieldless/schema";

test("parseSafe handles safeParse-style schemas", () => {
  const schema = {
    safeParse(input) {
      if (typeof input === "string") {
        return {
          success: true,
          data: input.toUpperCase(),
        };
      }

      return {
        success: false,
        error: new Error("invalid"),
      };
    },
  };

  const success = parseSafe(schema, "ok");
  const failure = parseSafe(schema, 42);

  assert.equal(success[0], null);
  assert.equal(success[1], "OK");
  assert.equal(failure[0]?.message, "invalid");
  assert.equal(failure[1], null);
});

test("parseSafe catches exceptions from parse-style schemas", () => {
  const schema = {
    parse(input) {
      if (typeof input !== "number") {
        throw new Error("expected number");
      }

      return input * 2;
    },
  };

  const result = parseSafe(schema, "nope");

  assert.equal(result[0]?.message, "expected number");
  assert.equal(result[1], null);
});

test("parseAsyncSafe handles async schema variants", async () => {
  const schema = {
    async safeParseAsync(input) {
      if (typeof input === "object" && input !== null) {
        return {
          success: true,
          data: input,
        };
      }

      return {
        success: false,
        error: new Error("invalid object"),
      };
    },
  };

  const success = await parseAsyncSafe(schema, { ok: true });
  const failure = await parseAsyncSafe(schema, null);

  assert.equal(success[0], null);
  assert.deepEqual(success[1], { ok: true });
  assert.equal(failure[0]?.message, "invalid object");
  assert.equal(failure[1], null);
});
