import assert from "node:assert/strict";
import test from "node:test";

import {
  createIpcBridge,
  createIpcMain,
  createIpcRenderer,
  deserializeIpcResult,
  serializeIpcError,
} from "yieldless/ipc";

function createIpcPair() {
  const handlers = new Map();

  return {
    ipcMain: {
      handle(channel, listener) {
        handlers.set(channel, listener);
      },
      removeHandler(channel) {
        handlers.delete(channel);
      },
    },
    ipcRenderer: {
      async invoke(channel, ...args) {
        const handler = handlers.get(channel);

        if (handler === undefined) {
          throw new Error(`Missing handler for ${channel}`);
        }

        return await handler({ senderId: 1 }, ...args);
      },
    },
  };
}

test("IPC bridge preserves successful tuples across invoke/handle", async () => {
  const pair = createIpcPair();
  const server = createIpcMain(pair.ipcMain);
  const client = createIpcRenderer(pair.ipcRenderer);

  server.handle("git:status", async (_event, repoPath) => [null, `${repoPath}:clean`]);

  const result = await client.invoke("git:status", "/tmp/repo");

  assert.equal(result[0], null);
  assert.equal(result[1], "/tmp/repo:clean");
});

test("IPC bridge serializes tuple errors into clone-safe objects", async () => {
  const pair = createIpcPair();
  const server = createIpcMain(pair.ipcMain);
  const client = createIpcRenderer(pair.ipcRenderer);

  server.handle("git:fetch", async () => [
    Object.assign(new Error("fetch failed"), {
      code: "E_GIT",
      details: { remote: "origin" },
    }),
    null,
  ]);

  const result = await client.invoke("git:fetch");

  assert.equal(result[1], null);
  assert.equal(result[0]?.name, "Error");
  assert.equal(result[0]?.message, "fetch failed");
  assert.equal(result[0]?.code, "E_GIT");
  assert.deepEqual(result[0]?.details, { remote: "origin" });
  assert.equal(typeof result[0]?.stack, "string");
});

test("IPC bridge converts thrown handler errors into tuple errors", async () => {
  const pair = createIpcPair();
  const server = createIpcMain(pair.ipcMain);
  const client = createIpcRenderer(pair.ipcRenderer);

  server.handle("git:clone", async () => {
    throw new Error("clone exploded");
  });

  const result = await client.invoke("git:clone");

  assert.equal(result[1], null);
  assert.equal(result[0]?.message, "clone exploded");
});

test("createIpcBridge exposes one method per allowed channel", async () => {
  const pair = createIpcPair();
  const server = createIpcMain(pair.ipcMain);
  const client = createIpcRenderer(pair.ipcRenderer);
  const bridge = createIpcBridge(client, Object.freeze(["git:head"]));

  server.handle("git:head", async () => [null, "abc123"]);

  const result = await bridge["git:head"]();

  assert.equal(result[0], null);
  assert.equal(result[1], "abc123");
});

test("deserializeIpcResult guards against invalid payloads", () => {
  const result = deserializeIpcResult("bad-payload");

  assert.equal(result[1], null);
  assert.equal(result[0]?.message, "Invalid IPC tuple payload.");
});

test("serializeIpcError preserves plain-object metadata", () => {
  const error = serializeIpcError({
    name: "GitError",
    message: "bad ref",
    code: "BAD_REF",
    details: { ref: "HEAD~1" },
  });

  assert.deepEqual(error, {
    name: "GitError",
    message: "bad ref",
    code: "BAD_REF",
    details: { ref: "HEAD~1" },
  });
});
