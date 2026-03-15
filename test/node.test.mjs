import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  CommandError,
  mkdirSafe,
  readFileSafe,
  readdirSafe,
  rmSafe,
  runCommandSafe,
  statSafe,
  writeFileSafe,
} from "yieldless/node";

test("filesystem wrappers return tuple results", async () => {
  const root = await mkdtemp(join(tmpdir(), "yieldless-node-"));
  const nestedDir = join(root, "nested");
  const filePath = join(nestedDir, "notes.txt");

  const mkdirResult = await mkdirSafe(nestedDir, { recursive: true });
  assert.equal(mkdirResult[0], null);

  const writeResult = await writeFileSafe(filePath, "hello");
  assert.equal(writeResult[0], null);

  const readResult = await readFileSafe(filePath);
  assert.equal(readResult[0], null);
  assert.equal(readResult[1], "hello");

  const readdirResult = await readdirSafe(nestedDir);
  assert.equal(readdirResult[0], null);
  assert.deepEqual(readdirResult[1], ["notes.txt"]);

  const statResult = await statSafe(filePath);
  assert.equal(statResult[0], null);
  assert.equal(statResult[1]?.isFile(), true);

  const removeResult = await rmSafe(root, { force: true, recursive: true });
  assert.equal(removeResult[0], null);
});

test("filesystem wrappers return native errors for missing paths", async () => {
  const result = await readFileSafe(join(tmpdir(), "yieldless-missing-file.txt"));

  assert.notEqual(result[0], null);
  assert.equal(result[0]?.code, "ENOENT");
  assert.equal(result[1], null);
});

test("runCommandSafe captures stdout on success", async () => {
  const result = await runCommandSafe(process.execPath, [
    "-e",
    "process.stdout.write('ok')",
  ]);

  assert.equal(result[0], null);
  assert.equal(result[1]?.stdout, "ok");
  assert.equal(result[1]?.stderr, "");
});

test("runCommandSafe returns a CommandError on non-zero exit", async () => {
  const result = await runCommandSafe(process.execPath, [
    "-e",
    "process.stderr.write('broken'); process.exit(7)",
  ]);

  assert.notEqual(result[0], null);
  assert.equal(result[0] instanceof CommandError, true);
  assert.equal(result[0]?.stderr, "broken");
  assert.equal(result[0]?.exitCode, 7);
  assert.equal(result[1], null);
});
