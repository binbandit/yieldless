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
  /** Directory to run the command from. */
  readonly cwd?: FilePath;
  /** Environment variables for the child process. */
  readonly env?: NodeJS.ProcessEnv;
  /** Text written to stdin before stdin is closed. */
  readonly input?: string;
  /** Signal used when aborting the child process. */
  readonly killSignal?: NodeJS.Signals | number;
  /** Maximum combined stdout/stderr bytes to capture before aborting. */
  readonly maxOutputBytes?: number;
  /** Receives stderr chunks while the command is still running. */
  readonly onStderr?: (chunk: string) => void;
  /** Receives stdout chunks while the command is still running. */
  readonly onStdout?: (chunk: string) => void;
  /** Parent cancellation signal forwarded to the child process. */
  readonly signal?: AbortSignal;
  /** Milliseconds before the command is aborted with CommandTimeoutError. */
  readonly timeoutMs?: number;
  /** Hide subprocess windows on Windows. Defaults to true. */
  readonly windowsHide?: boolean;
}

export interface ShellCommandOptions extends CommandOptions {
  /** Shell used to run the command string. Defaults to Node's platform shell. */
  readonly shell?: boolean | string;
}

export interface CommandResult {
  /** Arguments passed to the executable. Empty for shell command strings. */
  readonly args: readonly string[];
  /** Human-readable command string for logging and diagnostics. */
  readonly command: string;
  /** Directory the command ran from, when provided. */
  readonly cwd?: FilePath;
  /** Wall-clock runtime in milliseconds. */
  readonly durationMs: number;
  readonly exitCode: number;
  readonly signal: NodeJS.Signals | null;
  readonly stderr: string;
  readonly stdout: string;
}

export class CommandError extends Error {
  readonly args: readonly string[];
  readonly code?: string;
  readonly command: string;
  readonly cwd?: FilePath;
  readonly durationMs: number;
  readonly exitCode: number | null;
  readonly signal: NodeJS.Signals | null;
  readonly stderr: string;
  readonly stdout: string;

  constructor(
    file: string,
    args: readonly string[],
    result: {
      readonly code?: string;
      readonly cwd?: FilePath;
      readonly durationMs: number;
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
    this.args = [...args];
    this.command = command;

    if (result.cwd !== undefined) {
      this.cwd = result.cwd;
    }

    if (result.code !== undefined) {
      this.code = result.code;
    }

    this.durationMs = result.durationMs;
    this.exitCode = result.exitCode;
    this.signal = result.signal;
    this.stderr = result.stderr;
    this.stdout = result.stdout;
  }
}

export class CommandTimeoutError extends Error {
  readonly args: readonly string[];
  readonly command: string;
  readonly cwd?: FilePath;
  readonly durationMs: number;
  readonly exitCode: number | null;
  readonly signal: NodeJS.Signals | null;
  readonly stderr: string;
  readonly stdout: string;
  readonly timeoutMs: number;

  constructor(
    file: string,
    args: readonly string[],
    result: {
      readonly cwd?: FilePath;
      readonly durationMs: number;
      readonly exitCode: number | null;
      readonly signal: NodeJS.Signals | null;
      readonly stderr: string;
      readonly stdout: string;
      readonly timeoutMs: number;
    },
  ) {
    const command = [file, ...args].join(" ");

    super(`Command timed out after ${String(result.timeoutMs)}ms: ${command}`);
    this.name = "CommandTimeoutError";
    this.args = [...args];
    this.command = command;

    if (result.cwd !== undefined) {
      this.cwd = result.cwd;
    }

    this.durationMs = result.durationMs;
    this.exitCode = result.exitCode;
    this.signal = result.signal;
    this.stderr = result.stderr;
    this.stdout = result.stdout;
    this.timeoutMs = result.timeoutMs;
  }
}

export class CommandOutputLimitError extends Error {
  readonly args: readonly string[];
  readonly command: string;
  readonly cwd?: FilePath;
  readonly durationMs: number;
  readonly exitCode: number | null;
  readonly maxOutputBytes: number;
  readonly signal: NodeJS.Signals | null;
  readonly stderr: string;
  readonly stdout: string;
  readonly stream: "stdout" | "stderr";

  constructor(
    file: string,
    args: readonly string[],
    result: {
      readonly cwd?: FilePath;
      readonly durationMs: number;
      readonly exitCode: number | null;
      readonly maxOutputBytes: number;
      readonly signal: NodeJS.Signals | null;
      readonly stderr: string;
      readonly stdout: string;
      readonly stream: "stdout" | "stderr";
    },
  ) {
    const command = [file, ...args].join(" ");

    super(
      `Command exceeded ${String(result.maxOutputBytes)} output bytes on ${result.stream}: ${command}`,
    );
    this.name = "CommandOutputLimitError";
    this.args = [...args];
    this.command = command;

    if (result.cwd !== undefined) {
      this.cwd = result.cwd;
    }

    this.durationMs = result.durationMs;
    this.exitCode = result.exitCode;
    this.maxOutputBytes = result.maxOutputBytes;
    this.signal = result.signal;
    this.stderr = result.stderr;
    this.stdout = result.stdout;
    this.stream = result.stream;
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

interface InternalCommandOptions extends CommandOptions {
  readonly shell?: boolean | string;
}

type CommandAbortReason =
  | { readonly kind: "output-limit"; readonly stream: "stdout" | "stderr" }
  | { readonly kind: "timeout" };

function validateCommandOptions(options: CommandOptions): void {
  if (
    options.timeoutMs !== undefined &&
    (!Number.isFinite(options.timeoutMs) || options.timeoutMs < 0)
  ) {
    throw new RangeError("timeoutMs cannot be negative.");
  }

  if (
    options.maxOutputBytes !== undefined &&
    (!Number.isInteger(options.maxOutputBytes) || options.maxOutputBytes < 1)
  ) {
    throw new RangeError("maxOutputBytes must be a positive integer.");
  }
}

function linkAbortSignal(
  signal: AbortSignal | undefined,
  controller: AbortController,
): () => void {
  if (signal === undefined) {
    return (): void => undefined;
  }

  if (signal.aborted) {
    controller.abort(signal.reason);
    return (): void => undefined;
  }

  const onAbort = (): void => {
    controller.abort(signal.reason);
  };

  signal.addEventListener("abort", onAbort, { once: true });

  return (): void => {
    signal.removeEventListener("abort", onAbort);
  };
}

function createCommandResult(
  file: string,
  args: readonly string[],
  options: CommandOptions,
  result: {
    readonly durationMs: number;
    readonly exitCode: number;
    readonly signal: NodeJS.Signals | null;
    readonly stderr: string;
    readonly stdout: string;
  },
): CommandResult {
  return {
    args: [...args],
    command: [file, ...args].join(" "),
    ...(options.cwd === undefined ? {} : { cwd: options.cwd }),
    durationMs: result.durationMs,
    exitCode: result.exitCode,
    signal: result.signal,
    stderr: result.stderr,
    stdout: result.stdout,
  };
}

function createCommandErrorDetails(
  options: CommandOptions,
  result: {
    readonly durationMs: number;
    readonly exitCode: number | null;
    readonly signal: NodeJS.Signals | null;
    readonly stderr: string;
    readonly stdout: string;
  },
): {
  readonly cwd?: FilePath;
  readonly durationMs: number;
  readonly exitCode: number | null;
  readonly signal: NodeJS.Signals | null;
  readonly stderr: string;
  readonly stdout: string;
} {
  return {
    ...(options.cwd === undefined ? {} : { cwd: options.cwd }),
    durationMs: result.durationMs,
    exitCode: result.exitCode,
    signal: result.signal,
    stderr: result.stderr,
    stdout: result.stdout,
  };
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
  return await runCommandInternal(file, args, options);
}

async function runCommandInternal(
  file: string,
  args: readonly string[],
  options: InternalCommandOptions,
): Promise<CommandResult> {
  validateCommandOptions(options);

  return await new Promise<CommandResult>((resolve, reject): void => {
    const controller = new AbortController();
    const cleanupAbortLink = linkAbortSignal(options.signal, controller);
    const stdoutChunks: string[] = [];
    const stderrChunks: string[] = [];
    let totalOutputBytes = 0;
    let commandAbortReason: CommandAbortReason | null = null;
    let pendingError: Error | null = null;
    const startedAt = Date.now();
    const timeout =
      options.timeoutMs === undefined
        ? null
        : setTimeout((): void => {
            if (controller.signal.aborted) {
              return;
            }

            commandAbortReason = { kind: "timeout" };
            controller.abort(new Error("Command timed out."));
          }, options.timeoutMs);

    const cleanup = (): void => {
      cleanupAbortLink();

      if (timeout !== null) {
        clearTimeout(timeout);
      }
    };

    let child: ReturnType<typeof spawn>;

    try {
      child = spawn(file, [...args], {
        cwd: options.cwd,
        env: options.env,
        ...(options.killSignal === undefined
          ? {}
          : { killSignal: options.killSignal }),
        ...(options.shell === undefined ? {} : { shell: options.shell }),
        signal: controller.signal,
        stdio: "pipe",
        windowsHide: options.windowsHide ?? true,
      });
    } catch (error: unknown) {
      cleanup();
      reject(error);
      return;
    }

    const appendOutput = (
      stream: "stdout" | "stderr",
      chunk: string,
    ): void => {
      try {
        if (stream === "stdout") {
          options.onStdout?.(chunk);
        } else {
          options.onStderr?.(chunk);
        }
      } catch (error: unknown) {
        pendingError = error as Error;

        if (!controller.signal.aborted) {
          controller.abort(error);
        }

        return;
      }

      const maxOutputBytes = options.maxOutputBytes;

      if (maxOutputBytes === undefined) {
        if (stream === "stdout") {
          stdoutChunks.push(chunk);
        } else {
          stderrChunks.push(chunk);
        }

        return;
      }

      const chunkBytes = Buffer.byteLength(chunk);
      const nextTotal = totalOutputBytes + chunkBytes;

      if (nextTotal <= maxOutputBytes) {
        totalOutputBytes = nextTotal;

        if (stream === "stdout") {
          stdoutChunks.push(chunk);
        } else {
          stderrChunks.push(chunk);
        }

        return;
      }

      const remainingBytes = Math.max(0, maxOutputBytes - totalOutputBytes);

      if (remainingBytes > 0) {
        const partial = Buffer.from(chunk)
          .subarray(0, remainingBytes)
          .toString("utf8");

        if (stream === "stdout") {
          stdoutChunks.push(partial);
        } else {
          stderrChunks.push(partial);
        }
      }

      totalOutputBytes = maxOutputBytes;

      if (commandAbortReason === null) {
        commandAbortReason = { kind: "output-limit", stream };

        if (!controller.signal.aborted) {
          controller.abort(new Error("Command output limit exceeded."));
        }
      }
    };

    child.stdout?.setEncoding("utf8");
    child.stdout?.on("data", (chunk: string): void => {
      appendOutput("stdout", chunk);
    });

    child.stderr?.setEncoding("utf8");
    child.stderr?.on("data", (chunk: string): void => {
      appendOutput("stderr", chunk);
    });

    child.once("error", (error: Error): void => {
      if (pendingError === null) {
        pendingError = error;
      }
    });

    child.once("close", (exitCode: number | null, signal: NodeJS.Signals | null): void => {
      cleanup();

      const stdout = stdoutChunks.join("");
      const stderr = stderrChunks.join("");
      const durationMs = Date.now() - startedAt;

      if (commandAbortReason?.kind === "timeout") {
        reject(
          new CommandTimeoutError(file, args, {
            ...createCommandErrorDetails(options, {
              durationMs,
              exitCode,
              signal,
              stderr,
              stdout,
            }),
            timeoutMs: options.timeoutMs as number,
          }),
        );
        return;
      }

      if (commandAbortReason?.kind === "output-limit") {
        reject(
          new CommandOutputLimitError(file, args, {
            ...createCommandErrorDetails(options, {
              durationMs,
              exitCode,
              signal,
              stderr,
              stdout,
            }),
            maxOutputBytes: options.maxOutputBytes as number,
            stream: commandAbortReason.stream,
          }),
        );
        return;
      }

      if (pendingError !== null) {
        reject(
          Object.assign(pendingError, {
            args: [...args],
            command: [file, ...args].join(" "),
            ...(options.cwd === undefined ? {} : { cwd: options.cwd }),
            durationMs,
            exitCode,
            signal,
            stderr,
            stdout,
          }),
        );
        return;
      }

      if (exitCode === 0) {
        resolve(
          createCommandResult(file, args, options, {
            durationMs,
            exitCode: 0,
            signal,
            stderr,
            stdout,
          }),
        );
        return;
      }

      reject(
        new CommandError(file, args, {
          ...createCommandErrorDetails(options, {
            durationMs,
            exitCode,
            signal,
            stderr,
            stdout,
          }),
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
 * Executes a shell command string. Prefer {@link runCommand} when you can pass
 * executable and arguments separately.
 */
export async function runShellCommand(
  command: string,
  options: ShellCommandOptions = {},
): Promise<CommandResult> {
  return await runCommandInternal(command, [], {
    ...options,
    shell: options.shell ?? true,
  });
}

/**
 * Tuple wrapper for {@link runCommand}.
 */
export async function runCommandSafe(
  file: string,
  args: readonly string[] = [],
  options: CommandOptions = {},
): Promise<
  SafeResult<
    CommandResult,
    | Error
    | CommandError
    | CommandOutputLimitError
    | CommandTimeoutError
    | NodeJS.ErrnoException
  >
> {
  try {
    const result = await runCommand(file, args, options);
    return [null, result];
  } catch (error: unknown) {
    return [
      error as
        | Error
        | CommandError
        | CommandOutputLimitError
        | CommandTimeoutError
        | NodeJS.ErrnoException,
      null,
    ];
  }
}

/**
 * Tuple wrapper for {@link runShellCommand}.
 */
export async function runShellCommandSafe(
  command: string,
  options: ShellCommandOptions = {},
): Promise<
  SafeResult<
    CommandResult,
    | Error
    | CommandError
    | CommandOutputLimitError
    | CommandTimeoutError
    | NodeJS.ErrnoException
  >
> {
  try {
    const result = await runShellCommand(command, options);
    return [null, result];
  } catch (error: unknown) {
    return [
      error as
        | Error
        | CommandError
        | CommandOutputLimitError
        | CommandTimeoutError
        | NodeJS.ErrnoException,
      null,
    ];
  }
}
