# Yieldless

Yieldless is a small TypeScript library for people who like the ergonomics of Effect-style code but do not want a custom runtime in the middle of everything.

Full documentation lives at <https://binbandit.github.io/yieldless/>.

The docs site also publishes agent-friendly context:

- <https://binbandit.github.io/yieldless/llms.txt> for a compact index of guides, reference pages, recipes, and per-page Markdown links
- <https://binbandit.github.io/yieldless/llms-full.txt> for the full documentation corpus as Markdown-oriented text

The library is built around four ideas:

- error handling as simple tuples
- readable tuple pipelines without a DSL
- structured concurrency through `AbortController`
- resource cleanup through native `await using`
- dependency injection through plain functions
- configuration parsing as ordinary data

The next layer adds practical backend pieces on top of those primitives:

- retry loops with abort-aware backoff
- deadline helpers for any abort-aware operation
- abort-aware sleep and polling
- fetch helpers with status, timeout, and JSON handling
- result combinators for success/error pipelines
- environment readers and schema-backed config parsing
- abort-aware one-shot event waits
- async context storage for request-scoped data and spans
- tuple-native parallel and bounded-work combinators
- sync and async iterable workflows
- in-flight request deduplication
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

`safeTry` and `safeTrySync` turn thrown values into `[error, value]` tuples. `ok`, `err`, and `match` make those tuples easier to return and fold at app boundaries.

```ts
import { err, match, ok, safeTry, safeTrySync, unwrap } from "yieldless/error";

const [readError, body] = await safeTry(fetch("https://example.com"));

if (readError) {
  console.error(readError);
}

const parsed = safeTrySync(() => JSON.parse("{\"ok\":true}"));
const value = unwrap(parsed);

const uiState = match(ok(value), {
  ok: (data) => ({ kind: "ready", data }),
  err: (error) => ({ kind: "error", message: String(error) }),
});
```

### `yieldless/result`

`yieldless/result` adds tiny combinators for tuple pipelines that have grown past one early return.

```ts
import { safeTry } from "yieldless/error";
import { andThenAsync, fromNullable, mapOk } from "yieldless/result";

const result = await andThenAsync(
  await safeTry(loadUser(userId)),
  async (user) =>
    mapOk(
      fromNullable(user, () => new Error("User not found")),
      (value) => ({ id: value.id, name: value.name }),
    ),
);
```

Use these helpers when they remove noise. A direct `if (error) return [error, null]` is still the right shape for simple branches.

### `yieldless/task`

`runTaskGroup` gives you shared cancellation without a separate scheduler or fiber runtime.

```ts
import { runTaskGroup } from "yieldless/task";

const requestController = new AbortController();

const result = await runTaskGroup(async (group) => {
  const userTask = group.spawn(async (signal) => loadUser(signal));
  const auditTask = group.spawn(async (signal) => writeAuditLog(signal));

  const user = await userTask;
  await auditTask;

  return user;
}, {
  signal: requestController.signal,
});
```

If one spawned task fails, the group aborts the shared signal, waits for the remaining children to settle, and then rethrows the original failure.
If you pass an upstream `AbortSignal`, the group inherits that cancellation too.

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

### `yieldless/env`

`readEnv`, `pickEnv`, and `parseEnvSafe` make startup config explicit without a config framework.

```ts
import { parseEnvSafe, pickEnv } from "yieldless/env";

const [error, env] = parseEnvSafe(
  envSchema,
  pickEnv(process.env, ["DATABASE_URL", "PORT"] as const),
);
```

Missing and empty values can be handled as tuple errors, and schema validation stays in the same flow as the rest of the app.

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

### `yieldless/signal`

`withTimeout` and `createTimeoutSignal` give any abort-aware operation a deadline without hand-writing timer cleanup.

```ts
import { safeTry } from "yieldless/error";
import { withTimeout } from "yieldless/signal";

const [error, response] = await safeTry(
  withTimeout(
    (signal) => fetch("https://example.com/api/reviews", { signal }),
    { timeoutMs: 5_000 },
  ),
);
```

If you need the lower-level signal for a longer scope, `createTimeoutSignal()` gives you a disposable derived signal that inherits parent cancellation too.

### `yieldless/timer`

`sleep`, `sleepSafe`, and `poll` cover small timing jobs without introducing a scheduler.

```ts
import { poll, sleep } from "yieldless/timer";

await sleep(250, { signal });

const [error, job] = await poll(
  async (_attempt, signal) => readJobStatus(jobId, signal),
  {
    intervalMs: 1_000,
    timeoutMs: 30_000,
    signal,
  },
);
```

Poll attempts share the same abort signal as the interval wait, so user navigation or request cancellation stops the whole loop.

### `yieldless/fetch`

`fetchSafe` and `fetchJsonSafe` keep native `fetch()` calls in tuple form while adding common production edges.

```ts
import { fetchJsonSafe } from "yieldless/fetch";

const [error, user] = await fetchJsonSafe<{ id: string }>(
  `https://api.example.com/users/${userId}`,
  {
    timeoutMs: 5_000,
    signal,
  },
);
```

Non-ok responses return `HttpStatusError`, JSON parser failures return `JsonParseError`, and timeouts use the same abort primitives as the rest of the library.

### `yieldless/event`

`onceEvent` and `onceEventSafe` bridge `EventTarget` / `EventEmitter` sources into async code with listener cleanup and abort support.

```ts
import { onceEventSafe } from "yieldless/event";

const [error, event] = await onceEventSafe(button, "click", { signal });
```

For Node-style emitters, `error` events reject the wait by default so socket and process boundaries behave naturally.

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

`all`, `race`, and `mapLimit` run tuple work with a shared abort signal.

```ts
import { all, mapLimit } from "yieldless/all";

const result = await all([
  (signal) => readPrimary(signal),
  (signal) => readReplica(signal),
]);

const [error, thumbnails] = await mapLimit(
  images,
  (image, _index, signal) => renderThumbnail(image, signal),
  { concurrency: 4 },
);
```

If one task returns `[error, null]`, the shared signal is aborted before the utility returns.
`mapLimit()` preserves input order while keeping only the configured number of items in flight, which is useful for API calls, file processing, and subprocess work that should not stampede a machine or service.

### `yieldless/iterable`

`collect`, `forEach`, and `mapAsyncLimit` bring the same tuple/cancellation style to sync and async iterables.

```ts
import { mapAsyncLimit } from "yieldless/iterable";

const [error, thumbnails] = await mapAsyncLimit(
  readImages(source),
  (image, _index, signal) => renderThumbnail(image, signal),
  {
    concurrency: 4,
    signal,
  },
);
```

Iterator failures and mapper failures are captured as tuple errors, and bounded mapping preserves input order.

### `yieldless/singleflight`

`singleFlight` deduplicates concurrent tuple work by key without becoming a cache.

```ts
import { singleFlight } from "yieldless/singleflight";

const loadRepository = singleFlight(
  async (signal, repoId: string) => readRepository(repoId, signal),
);

const [first, second] = await Promise.all([
  loadRepository("yieldless"),
  loadRepository("yieldless"),
]);
```

Only one operation runs for duplicate in-flight calls. Entries are removed after settlement, and `clear()` / `clearAll()` abort in-flight work.

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

`createIpcMain` and `createIpcRenderer` wrap Electron's `handle()` / `invoke()` pair and keep everything in tuple form. `createAbortableIpcMain` and friends add request cancellation for renderers that switch screens quickly.

```ts
import {
  createAbortableIpcBridge,
  createAbortableIpcMain,
  createAbortableIpcRenderer,
} from "yieldless/ipc";
```

Tuple errors are serialized into plain objects before they cross the IPC boundary, so the renderer does not rely on Electron's lossy thrown-error conversion.
If you need renderer-driven cancellation, the abortable IPC helpers let an `AbortSignal` stop the in-flight main-process work too.

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
