import assert from "node:assert/strict";
import test from "node:test";

import { all, race } from "yieldless/all";

test("all returns successful values in task order", async () => {
  const result = await all([
    async () => [null, "first"],
    async () => [null, "second"],
  ]);

  assert.equal(result[0], null);
  assert.deepEqual(result[1], ["first", "second"]);
});

test("all aborts sibling tasks on the first tuple error", async () => {
  let siblingAborted = false;

  const result = await all([
    async (signal) => {
      await new Promise((resolve, reject) => {
        const timer = setTimeout(resolve, 1_000);

        signal.addEventListener(
          "abort",
          () => {
            siblingAborted = true;
            clearTimeout(timer);
            reject(signal.reason);
          },
          { once: true },
        );
      });

      return [null, "late"];
    },
    async () => [new Error("boom"), null],
  ]);

  assert.equal(result[0]?.message, "boom");
  assert.equal(result[1], null);
  assert.equal(siblingAborted, true);
});

test("race returns the first successful tuple and aborts the rest", async () => {
  let siblingAborted = false;

  const result = await race([
    async (signal) => {
      await new Promise((resolve, reject) => {
        const timer = setTimeout(resolve, 1_000);

        signal.addEventListener(
          "abort",
          () => {
            siblingAborted = true;
            clearTimeout(timer);
            reject(signal.reason);
          },
          { once: true },
        );
      });

      return [null, "slow"];
    },
    async () => [null, "fast"],
  ]);

  assert.equal(result[0], null);
  assert.equal(result[1], "fast");
  assert.equal(siblingAborted, true);
});
