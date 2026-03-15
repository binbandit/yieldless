import { spawn } from "node:child_process";
import { access, mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import type { Stats } from "node:fs";

import type { SafeResult } from "yieldless/error";

export type FilePath = string | URL;

export interface WriteTextFileOptions {
  readonly flag?: string;
  readonly mode?: number;
}

export interface MakeDirectoryOptions {
  readonly mode?: number;
  readonly recursive?: boolean;
}

export interface RemovePathOptions {
  readonly force?: boolean;
  readonly maxRetries?: number;
  readonly recursive?: boolean;
  readonly retryDelay?: number;
}

export interface CommandOptions {
  readonly cwd?: FilePath;
  readonly env?: NodeJS.ProcessEnv;
  readonly input?: string;
  readonly signal?: AbortSignal;
  readonly windowsHide?: boolean;
}

export interface CommandResult {
  readonly stdout: string;
  readonly stderr: string;
  readonly exitCode: number;
  readonly signal: NodeJS.Signals | null;
}

export class CommandError extends Error {
  readonly code?: string;
  readonly exitCode: number | null;
  readonly signal: NodeJS.Signals | null;
  readonly stderr: string;
  readonly stdout: string;

  constructor(
    file: string,
    args: readonly string[],
    result: {
      readonly code?: string;
      readonly exitCode: number | null;
      readonly signal: NodeJS.Signals | null;
      readonly stderr: string;
      readonly stdout: string;
    },
  ) {
    const command = [file, ...args].join(" ");
    const reason =
      result.signal !== null
        ? `signal ${result.signal}`
        : `exit code ${String(result.exitCode)}`;

    super(`Command failed (${reason}): ${command}`);
    this.name = "CommandError";

    if (result.code !== undefined) {
      this.code = result.code;
    }

    this.exitCode = result.exitCode;
    this.signal = result.signal;
    this.stderr = result.stderr;
    this.stdout = result.stdout;
  }
}

/**
 * Checks whether the current process can access a path.
 */
export async function accessSafe(
  path: FilePath,
): Promise<SafeResult<void, NodeJS.ErrnoException>> {
  try {
    await access(path);
    return [null, undefined];
  } catch (error: unknown) {
    return [error as NodeJS.ErrnoException, null];
  }
}

/**
 * Reads a text file and returns its contents without throwing.
 */
export async function readFileSafe(
  path: FilePath,
  encoding: BufferEncoding = "utf8",
): Promise<SafeResult<string, NodeJS.ErrnoException>> {
  try {
    const contents = await readFile(path, { encoding });
    return [null, contents];
  } catch (error: unknown) {
    return [error as NodeJS.ErrnoException, null];
  }
}

/**
 * Writes a text file and captures filesystem failures in a tuple.
 */
export async function writeFileSafe(
  path: FilePath,
  contents: string,
  options: WriteTextFileOptions = {},
): Promise<SafeResult<void, NodeJS.ErrnoException>> {
  try {
    await writeFile(path, contents, {
      encoding: "utf8",
      flag: options.flag,
      mode: options.mode,
    });
    return [null, undefined];
  } catch (error: unknown) {
    return [error as NodeJS.ErrnoException, null];
  }
}

/**
 * Lists the names of entries in a directory.
 */
export async function readdirSafe(
  path: FilePath,
): Promise<SafeResult<readonly string[], NodeJS.ErrnoException>> {
  try {
    const entries = await readdir(path);
    return [null, entries];
  } catch (error: unknown) {
    return [error as NodeJS.ErrnoException, null];
  }
}

/**
 * Creates a directory and returns the created path when Node provides one.
 */
export async function mkdirSafe(
  path: FilePath,
  options: MakeDirectoryOptions = {},
): Promise<SafeResult<string | undefined, NodeJS.ErrnoException>> {
  try {
    const createdPath = await mkdir(path, {
      mode: options.mode,
      recursive: options.recursive,
    });
    return [null, createdPath];
  } catch (error: unknown) {
    return [error as NodeJS.ErrnoException, null];
  }
}

/**
 * Removes a file or directory without throwing.
 */
export async function rmSafe(
  path: FilePath,
  options: RemovePathOptions = {},
): Promise<SafeResult<void, NodeJS.ErrnoException>> {
  try {
    const removeOptions: {
      force?: boolean;
      maxRetries?: number;
      recursive?: boolean;
      retryDelay?: number;
    } = {};

    if (options.force !== undefined) {
      removeOptions.force = options.force;
    }

    if (options.maxRetries !== undefined) {
      removeOptions.maxRetries = options.maxRetries;
    }

    if (options.recursive !== undefined) {
      removeOptions.recursive = options.recursive;
    }

    if (options.retryDelay !== undefined) {
      removeOptions.retryDelay = options.retryDelay;
    }

    await rm(path, removeOptions);
    return [null, undefined];
  } catch (error: unknown) {
    return [error as NodeJS.ErrnoException, null];
  }
}

/**
 * Reads filesystem metadata for a path.
 */
export async function statSafe(
  path: FilePath,
): Promise<SafeResult<Stats, NodeJS.ErrnoException>> {
  try {
    const fileStat = await stat(path);
    return [null, fileStat];
  } catch (error: unknown) {
    return [error as NodeJS.ErrnoException, null];
  }
}

/**
 * Executes a subprocess, captures `stdout`/`stderr`, and throws a
 * {@link CommandError} on failure.
 */
export async function runCommand(
  file: string,
  args: readonly string[] = [],
  options: CommandOptions = {},
): Promise<CommandResult> {
  return await new Promise<CommandResult>((resolve, reject): void => {
    const stdoutChunks: string[] = [];
    const stderrChunks: string[] = [];
    const child = spawn(file, [...args], {
      cwd: options.cwd,
      env: options.env,
      signal: options.signal,
      stdio: "pipe",
      windowsHide: options.windowsHide ?? true,
    });
    let pendingError: Error | null = null;

    child.stdout?.setEncoding("utf8");
    child.stdout?.on("data", (chunk: string): void => {
      stdoutChunks.push(chunk);
    });

    child.stderr?.setEncoding("utf8");
    child.stderr?.on("data", (chunk: string): void => {
      stderrChunks.push(chunk);
    });

    child.once("error", (error: Error): void => {
      pendingError = error;
    });

    child.once("close", (exitCode: number | null, signal: NodeJS.Signals | null): void => {
      const stdout = stdoutChunks.join("");
      const stderr = stderrChunks.join("");

      if (pendingError !== null) {
        reject(
          Object.assign(pendingError, {
            exitCode,
            signal,
            stderr,
            stdout,
          }),
        );
        return;
      }

      if (exitCode === 0) {
        resolve({
          stdout,
          stderr,
          exitCode: 0,
          signal,
        });
        return;
      }

      reject(
        new CommandError(file, args, {
          exitCode,
          signal,
          stderr,
          stdout,
        }),
      );
    });

    if (child.stdin !== null) {
      if (options.input !== undefined) {
        child.stdin.end(options.input);
        return;
      }

      child.stdin.end();
    }
  });
}

/**
 * Tuple wrapper for {@link runCommand}.
 */
export async function runCommandSafe(
  file: string,
  args: readonly string[] = [],
  options: CommandOptions = {},
): Promise<SafeResult<CommandResult, Error | CommandError | NodeJS.ErrnoException>> {
  try {
    const result = await runCommand(file, args, options);
    return [null, result];
  } catch (error: unknown) {
    return [error as Error | CommandError | NodeJS.ErrnoException, null];
  }
}
