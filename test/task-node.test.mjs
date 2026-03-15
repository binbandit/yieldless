import assert from "node:assert/strict";
import test from "node:test";

import { runCommandSafe } from "yieldless/node";
import { runTaskGroup } from "yieldless/task";

test("runCommandSafe aborts a long-running process through AbortSignal", async () => {
  const controller = new AbortController();
  const startedAt = Date.now();

  const running = runCommandSafe(
    process.execPath,
    ["-e", "setInterval(() => {}, 1_000)"],
    {
      signal: controller.signal,
    },
  );

  setTimeout(() => {
    controller.abort();
  }, 20);

  const result = await running;
  const elapsed = Date.now() - startedAt;

  assert.notEqual(result[0], null);
  assert.equal(result[0]?.name, "AbortError");
  assert.equal(result[1], null);
  assert.ok(elapsed < 500, `expected process to abort quickly, got ${elapsed}ms`);
});

test("runTaskGroup aborts spawned child processes when a sibling fails", async () => {
  const startedAt = Date.now();

  await assert.rejects(
    runTaskGroup(async (group) => {
      void group.spawn(async (signal) => {
        const result = await runCommandSafe(
          process.execPath,
          ["-e", "setInterval(() => {}, 1_000)"],
          { signal },
        );

        if (result[0] !== null && result[0].name !== "AbortError") {
          throw result[0];
        }
      });

      await group.spawn(async () => {
        throw new Error("boom");
      });

      return "unreachable";
    }),
    /boom/,
  );

  const elapsed = Date.now() - startedAt;
  assert.ok(elapsed < 500, `expected task group to abort child process quickly, got ${elapsed}ms`);
});
