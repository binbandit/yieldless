import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  accessSafe,
  CommandError,
  mkdirSafe,
  readFileSafe,
  readdirSafe,
  rmSafe,
  runCommandSafe,
  statSafe,
  writeFileSafe,
} from "yieldless/node";
import { runTaskGroup } from "yieldless/task";

describe("yieldless/node filesystem wrappers", () => {
  it("return tuple results for successful file operations", async () => {
    const root = await mkdtemp(join(tmpdir(), "yieldless-node-"));
    const nestedDir = join(root, "nested");
    const filePath = join(nestedDir, "notes.txt");

    expect((await mkdirSafe(nestedDir, { recursive: true }))[0]).toBeNull();
    expect((await writeFileSafe(filePath, "hello"))[0]).toBeNull();
    expect(await accessSafe(filePath)).toEqual([null, undefined]);
    expect(await readFileSafe(filePath)).toEqual([null, "hello"]);
    expect(await readdirSafe(nestedDir)).toEqual([null, ["notes.txt"]]);

    const [statError, statValue] = await statSafe(filePath);
    expect(statError).toBeNull();
    expect(statValue?.isFile()).toBe(true);

    expect((await rmSafe(root, { force: true, recursive: true }))[0]).toBeNull();
  });

  it("returns native errors for missing paths", async () => {
    const [error, value] = await readFileSafe(join(tmpdir(), "yieldless-missing-file.txt"));

    expect(error?.code).toBe("ENOENT");
    expect(value).toBeNull();
  });
});

describe("yieldless/node process wrappers", () => {
  it("captures stdout on success", async () => {
    const [error, result] = await runCommandSafe(process.execPath, [
      "-e",
      "process.stdout.write('ok')",
    ]);

    expect(error).toBeNull();
    expect(result?.stdout).toBe("ok");
    expect(result?.stderr).toBe("");
  });

  it("passes stdin through to the subprocess", async () => {
    const [error, result] = await runCommandSafe(
      process.execPath,
      ["-e", "process.stdin.setEncoding('utf8'); process.stdin.on('data', (chunk) => process.stdout.write(chunk.toUpperCase()))"],
      {
        input: "yieldless",
      },
    );

    expect(error).toBeNull();
    expect(result?.stdout).toBe("YIELDLESS");
  });

  it("returns a CommandError on non-zero exit", async () => {
    const [error, result] = await runCommandSafe(process.execPath, [
      "-e",
      "process.stderr.write('broken'); process.exit(7)",
    ]);

    expect(error).toBeInstanceOf(CommandError);
    expect(error).toMatchObject({
      exitCode: 7,
      stderr: "broken",
    });
    expect(result).toBeNull();
  });

  it("aborts a long-running process through AbortSignal", async () => {
    const controller = new AbortController();

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

    const [error, result] = await running;

    expect(error?.name).toBe("AbortError");
    expect(result).toBeNull();
  });

  it("aborts spawned child processes when a sibling task fails", async () => {
    await expect(
      runTaskGroup(async (group) => {
        void group.spawn(async (signal) => {
          const [error] = await runCommandSafe(
            process.execPath,
            ["-e", "setInterval(() => {}, 1_000)"],
            { signal },
          );

          if (error !== null && error.name !== "AbortError") {
            throw error;
          }
        });

        await group.spawn(async () => {
          throw new Error("boom");
        });

        return "never";
      }),
    ).rejects.toThrow("boom");
  });
});
