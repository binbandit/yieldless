import { describe, expect, it } from "vitest";

import { createContext, createTraceContext, withSpan } from "yieldless/context";
import {
  createAbortableIpcBridge,
  createAbortableIpcMain,
  createAbortableIpcRenderer,
  createIpcBridge,
  createIpcMain,
  createIpcRenderer,
  deserializeIpcResult,
  serializeIpcError,
} from "yieldless/ipc";
import {
  BadRequestError,
  honoHandler,
  NotFoundError,
} from "yieldless/router";
import { parseAsyncSafe, parseSafe } from "yieldless/schema";

function createIpcPair() {
  const handlers = new Map<string, (event: { senderId: number }, ...args: unknown[]) => unknown>();

  return {
    ipcMain: {
      handle(channel: string, listener: (event: { senderId: number }, ...args: unknown[]) => unknown) {
        handlers.set(channel, listener);
      },
      removeHandler(channel: string) {
        handlers.delete(channel);
      },
    },
    ipcRenderer: {
      async invoke(channel: string, ...args: unknown[]) {
        const handler = handlers.get(channel);

        if (handler === undefined) {
          throw new Error(`Missing handler for ${channel}`);
        }

        return await handler({ senderId: 1 }, ...args);
      },
    },
  };
}

describe("yieldless/context", () => {
  it("keeps values across async work created inside run", async () => {
    const requestContext = createContext<{ requestId: string }>();

    const value = await requestContext.run({ requestId: "req-1" }, async () => {
      await Promise.resolve();

      return await new Promise<string>((resolve) => {
        setTimeout(() => {
          resolve(requestContext.expect().requestId);
        }, 0);
      });
    });

    expect(value).toBe("req-1");
    expect(requestContext.get()).toBeUndefined();
  });

  it("bind captures the current store for later callbacks", () => {
    const requestContext = createContext<{ requestId: string }>();
    const bound = requestContext.run({ requestId: "req-2" }, () =>
      requestContext.bind(() => requestContext.expect().requestId),
    );

    expect(bound()).toBe("req-2");
  });

  it("withSpan publishes the active span and ends it on success", async () => {
    const traceContext = createTraceContext<{ end(): void; recordException(error: unknown): void }>();
    const events: string[] = [];

    const tracer = {
      startActiveSpan(name: string, fn: (span: { end(): void; recordException(error: unknown): void }) => Promise<string>) {
        events.push(`start:${name}`);

        const span = {
          end() {
            events.push("end");
          },
          recordException(error: unknown) {
            events.push(`error:${String(error)}`);
          },
        };

        return fn(span);
      },
    };

    const result = await withSpan(tracer, traceContext, "work", async (span) => {
      expect(traceContext.expect()).toBe(span);
      return "ok";
    });

    expect(result).toBe("ok");
    expect(events).toEqual(["start:work", "end"]);
  });
});

describe("yieldless/schema", () => {
  it("adapts safeParse-style schemas into tuples", () => {
    const schema = {
      safeParse(input: unknown) {
        return typeof input === "string"
          ? { success: true as const, data: input.toUpperCase() }
          : { success: false as const, error: new Error("invalid") };
      },
    };

    expect(parseSafe(schema, "ok")).toEqual([null, "OK"]);
    expect(parseSafe(schema, 42)[0]?.message).toBe("invalid");
  });

  it("supports async schema variants", async () => {
    const schema = {
      async safeParseAsync(input: unknown) {
        return input !== null
          ? { success: true as const, data: input }
          : { success: false as const, error: new Error("invalid object") };
      },
    };

    await expect(parseAsyncSafe(schema, { ok: true })).resolves.toEqual([null, { ok: true }]);
    const [error, value] = await parseAsyncSafe(schema, null);
    expect(error?.message).toBe("invalid object");
    expect(value).toBeNull();
  });
});

describe("yieldless/router", () => {
  const context = {
    json(body: unknown, status = 200) {
      return Response.json(body, { status });
    },
  };

  it("serializes successful tuple results", async () => {
    const handler = honoHandler(async () => [null, { ok: true }] as const, {
      successStatus: 201,
    });

    const response = await handler(context);

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({ ok: true });
  });

  it("maps known HTTP errors to JSON responses", async () => {
    const handler = honoHandler(async () => [new NotFoundError("missing"), null] as const);

    const response = await handler(context);

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: "not_found",
      message: "missing",
    });
  });

  it("supports custom success and error mapping", async () => {
    const handler = honoHandler(
      async () => ["invalid", null] as const,
      {
        mapError: (error) =>
          new BadRequestError(String(error), {
            details: { field: "email" },
          }),
      },
    );

    const response = await handler(context);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "bad_request",
      message: "invalid",
      details: { field: "email" },
    });
  });
});

describe("yieldless/ipc", () => {
  it("preserves successful tuples across invoke/handle", async () => {
    const pair = createIpcPair();
    const server = createIpcMain(pair.ipcMain);
    const client = createIpcRenderer(pair.ipcRenderer);

    server.handle("git:status", async (_event, repoPath: string) => [null, `${repoPath}:clean`] as const);

    await expect(client.invoke("git:status", "/tmp/repo")).resolves.toEqual([null, "/tmp/repo:clean"]);
  });

  it("serializes tuple errors into clone-safe objects", async () => {
    const pair = createIpcPair();
    const server = createIpcMain(pair.ipcMain);
    const client = createIpcRenderer(pair.ipcRenderer);

    server.handle("git:fetch", async () => [
      Object.assign(new Error("fetch failed"), {
        code: "E_GIT",
        details: { remote: "origin" },
      }),
      null,
    ] as const);

    const [error, value] = await client.invoke("git:fetch");

    expect(value).toBeNull();
    expect(error?.name).toBe("Error");
    expect(error?.message).toBe("fetch failed");
    expect(error?.code).toBe("E_GIT");
    expect(error?.details).toEqual({ remote: "origin" });
  });

  it("creates a preload-friendly bridge and validates payload decoding", async () => {
    const pair = createIpcPair();
    const server = createIpcMain(pair.ipcMain);
    const client = createIpcRenderer(pair.ipcRenderer);
    const bridge = createIpcBridge(client, ["git:head"] as const);

    server.handle("git:head", async () => [null, "abc123"] as const);

    await expect(bridge["git:head"]()).resolves.toEqual([null, "abc123"]);
    expect(deserializeIpcResult("bad-payload")[0]?.message).toBe("Invalid IPC tuple payload.");
    expect(
      serializeIpcError({
        name: "GitError",
        message: "bad ref",
        code: "BAD_REF",
      }),
    ).toEqual({
      name: "GitError",
      message: "bad ref",
      code: "BAD_REF",
    });
  });

  it("supports abortable IPC requests without changing the success shape", async () => {
    const pair = createIpcPair();
    const server = createAbortableIpcMain(pair.ipcMain);
    const client = createAbortableIpcRenderer(pair.ipcRenderer);
    const bridge = createAbortableIpcBridge(client, ["git:status"] as const);

    server.handle("git:status", async (_event, _signal, repoPath: string) => [
      null,
      `${repoPath}:clean`,
    ] as const);

    await expect(bridge["git:status"]("/tmp/repo")).resolves.toEqual([
      null,
      "/tmp/repo:clean",
    ]);
  });

  it("aborts an in-flight IPC request when the renderer signal is canceled", async () => {
    const pair = createIpcPair();
    const server = createAbortableIpcMain(pair.ipcMain);
    const client = createAbortableIpcRenderer(pair.ipcRenderer);
    const controller = new AbortController();
    let sawAbort = false;

    server.handle("git:diff", async (_event, signal) => {
      await new Promise<void>((resolve) => {
        signal.addEventListener(
          "abort",
          () => {
            sawAbort = true;
            resolve();
          },
          { once: true },
        );
      });

      return [new DOMException("IPC request canceled.", "AbortError"), null] as const;
    });

    const running = client.invokeWithSignal(controller.signal, "git:diff");

    setTimeout(() => {
      controller.abort(new Error("stale pull request view"));
    }, 20);

    const [error, value] = await running;

    expect(value).toBeNull();
    expect(error?.message).toBe("stale pull request view");
    expect(sawAbort).toBe(true);
  });
});
