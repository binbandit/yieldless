# Yieldless

Yieldless is a small TypeScript library for people who like the ergonomics of Effect-style code but do not want a custom runtime in the middle of everything.

Full documentation lives at <https://binbandit.github.io/yieldless/>.

The library is built around four ideas:

- error handling as simple tuples
- structured concurrency through `AbortController`
- resource cleanup through native `await using`
- dependency injection through plain functions

The next layer adds practical backend pieces on top of those primitives:

- retry loops with abort-aware backoff
- async context storage for request-scoped data and spans
- tuple-native parallel combinators
- schema adapters that stay in tuple-land
- route handlers that turn tuple errors into HTTP responses
- IPC bridges that keep tuple results intact across Electron boundaries
- Node filesystem and subprocess wrappers that return tuples

There are no runtime dependencies, and the package is split into subpath exports so callers can pull in only the piece they want.

## Status

This repo is intentionally small. The goal is to keep the surface area obvious and let the platform do as much of the work as possible.

## Installation

```bash
pnpm add yieldless
```

TypeScript `5.5+` is the target baseline. The package is compiled with `isolatedDeclarations` enabled.

## Modules

### `yieldless/error`

`safeTry` and `safeTrySync` turn thrown values into `[error, value]` tuples.

```ts
import { safeTry, safeTrySync, unwrap } from "yieldless/error";

const [readError, body] = await safeTry(fetch("https://example.com"));

if (readError) {
  console.error(readError);
}

const parsed = safeTrySync(() => JSON.parse("{\"ok\":true}"));
const value = unwrap(parsed);
```

### `yieldless/task`

`runTaskGroup` gives you shared cancellation without a separate scheduler or fiber runtime.

```ts
import { runTaskGroup } from "yieldless/task";

const result = await runTaskGroup(async (group) => {
  const userTask = group.spawn(async (signal) => loadUser(signal));
  const auditTask = group.spawn(async (signal) => writeAuditLog(signal));

  const user = await userTask;
  await auditTask;

  return user;
});
```

If one spawned task fails, the group aborts the shared signal, waits for the remaining children to settle, and then rethrows the original failure.

### `yieldless/resource`

`acquireResource` wraps a value with native async disposal.

```ts
import { acquireResource } from "yieldless/resource";

{
  await using db = await acquireResource(connect, disconnect);
  await db.value.query("select 1");
}
```

The release function runs once when the scope exits.

### `yieldless/di`

`inject` is just dependency binding for plain functions.

```ts
import { inject } from "yieldless/di";

const handler = (
  deps: { logger: { info(message: string): void } },
  name: string,
) => {
  deps.logger.info(`hello ${name}`);
};

const run = inject(handler, {
  logger: console,
});

run("world");
```

### `yieldless/retry`

`safeRetry` wraps tuple-returning operations with exponential backoff.

```ts
import { safeRetry } from "yieldless/retry";

const result = await safeRetry(
  async (_attempt, signal) => safeTry(fetchWithSignal(signal)),
  {
    maxAttempts: 5,
    baseDelayMs: 100,
  },
);
```

The retry delay respects `AbortSignal`, so a canceled parent task does not leave timers hanging around.

### `yieldless/context`

`createContext` wraps `AsyncLocalStorage` without trying to turn it into a global container.

```ts
import { createContext, withSpan } from "yieldless/context";

const requestContext = createContext<{ requestId: string }>();

await requestContext.run({ requestId: crypto.randomUUID() }, async () => {
  console.log(requestContext.expect().requestId);
});
```

For tracing, `withSpan` works with a tracer that exposes `startActiveSpan`, which matches the OpenTelemetry style API.

### `yieldless/all`

`all` and `race` run tuple tasks with a shared abort signal.

```ts
import { all } from "yieldless/all";

const result = await all([
  (signal) => readPrimary(signal),
  (signal) => readReplica(signal),
]);
```

If one task returns `[error, null]`, the shared signal is aborted before the utility returns.

### `yieldless/schema`

`parseSafe` adapts `safeParse()` and `parse()` style validators into tuple results.

```ts
import { parseSafe } from "yieldless/schema";

const [error, user] = parseSafe(userSchema, input);
```

That keeps validation failures in the same `[error, value]` flow as the rest of the library.

### `yieldless/router`

`honoHandler` turns tuple-returning route handlers into ordinary `Response` objects.

```ts
import { honoHandler, NotFoundError } from "yieldless/router";

const getUser = honoHandler(async (c) => {
  const user = await loadUser(c.req.param("id"));

  if (user === null) {
    return [new NotFoundError("user not found"), null];
  }

  return [null, user];
});
```

Known HTTP-style errors map to status codes automatically, and everything else falls back to a generic `500`.

### `yieldless/ipc`

`createIpcMain` and `createIpcRenderer` wrap Electron's `handle()` / `invoke()` pair and keep everything in tuple form.

```ts
import { createIpcMain, createIpcRenderer } from "yieldless/ipc";
```

Tuple errors are serialized into plain objects before they cross the IPC boundary, so the renderer does not rely on Electron's lossy thrown-error conversion.

### `yieldless/node`

`yieldless/node` wraps the pieces of Node you usually touch in backend tools: filesystem calls and subprocess execution.

```ts
import { readFileSafe, runCommandSafe } from "yieldless/node";

const [fileError, contents] = await readFileSafe(".git/HEAD");
const [gitError, result] = await runCommandSafe("git", ["status", "--short"]);
```

Command failures come back as tuple errors with captured `stdout`, `stderr`, and exit status instead of rejected promises.

If you pass an `AbortSignal`, the subprocess is terminated through Node's native child-process cancellation support and the wrapper does not settle until the child has actually closed.

## Design Notes

The package leans on current platform features rather than inventing replacements for them:

- `Promise` and `async`/`await` for sequencing
- `AbortController` and `AbortSignal` for cancellation
- `AsyncDisposable` and `Symbol.asyncDispose` for cleanup
- ordinary higher-order functions for dependency injection

That keeps the implementation small and makes the failure modes easier to reason about when something goes wrong.

## Caveats

- `SafeResult` uses `null` as the sentinel value in each tuple slot. If your success value is literally `null`, the type system cannot fully discriminate that case.
- `runTaskGroup` can only cancel work that actually respects the passed `AbortSignal`.
- `await using` requires runtime support for explicit resource management.

## Agent Skill

This repo ships an [Agent Skill](https://agentskills.io) so AI coding agents understand yieldless conventions out of the box. Install it with the [`skills`](https://npmjs.com/package/skills) CLI:

```bash
npx skills add binbandit/yieldless
```

The installer auto-detects which agents you have (Claude Code, Cursor, Codex, etc.) and links the skill into each one. You can also target a specific agent:

```bash
npx skills add binbandit/yieldless -a claude-code
```

Or install globally so it is available across all your projects:

```bash
npx skills add binbandit/yieldless -g
```

Once installed, your agent will know the tuple conventions, subpath imports, `AbortSignal` patterns, and every module in the library.

## Development

```bash
pnpm install
pnpm build
pnpm check
pnpm test
pnpm test:watch
pnpm docs:dev
pnpm docs:build
pnpm docs:check
```
