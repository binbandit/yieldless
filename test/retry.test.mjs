import assert from "node:assert/strict";
import test from "node:test";

import { safeRetry } from "yieldless/retry";

test("safeRetry returns the first successful result", async () => {
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

  assert.equal(attempts, 3);
  assert.equal(result[0], null);
  assert.equal(result[1], "ok");
});

test("safeRetry stops waiting when the parent signal aborts", async () => {
  const controller = new AbortController();
  const startedAt = Date.now();

  const retrying = safeRetry(
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

  const result = await retrying;
  const elapsed = Date.now() - startedAt;

  assert.notEqual(result[0], null);
  assert.equal(result[0]?.message, "stop");
  assert.equal(result[1], null);
  assert.ok(elapsed < 500, `expected abort to cut the delay short, got ${elapsed}ms`);
});
