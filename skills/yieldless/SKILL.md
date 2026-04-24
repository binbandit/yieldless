---
name: yieldless
description: Write TypeScript code using the yieldless library for tuple-based error handling, structured concurrency, retry, dependency injection, and resource management. Use when writing or reviewing code that imports from yieldless, or when the user asks about safe error handling with tuples, AbortSignal-based concurrency, or async resource disposal in TypeScript.
---

# Yieldless

Zero-dependency TypeScript library providing Effect-style ergonomics on native platform primitives. Every async operation returns a `[error, value]` tuple instead of throwing. Cancellation flows through `AbortSignal`. Resource cleanup uses native `await using`.

## Core type

```ts
type SafeResult<T, E = Error> =
  | readonly [error: E, value: null]
  | readonly [error: null, value: T];
```

All modules return or consume this type. Check `result[0]` for the error, `result[1]` for the value. `null` is the sentinel in both slots.

## Modules

Import from subpath exports. Never import from the barrel `"yieldless"` in production code; use the specific subpath.

### yieldless/error

Foundation. Wraps promises and sync functions into tuples and gives you readable tuple constructors plus a fold helper for UI boundaries.

```ts
import { err, match, ok, safeTry, safeTrySync, unwrap } from "yieldless/error";

const [readError, body] = await safeTry(fetch(url));
const [parseErr, data] = safeTrySync(() => JSON.parse(raw));
const value = unwrap(result); // rethrows if error
return parseErr ? err(parseErr) : ok(data);
```

### yieldless/result

Small tuple combinators. Use them when a tuple flow has multiple transformation steps but does not need a framework-owned runtime or pipe DSL.

```ts
import { andThenAsync, fromNullable, mapOk, tapErr } from "yieldless/result";

const result = await andThenAsync(
  await safeTry(loadUser(userId)),
  async (user) =>
    mapOk(
      fromNullable(user, () => new Error("User not found")),
      (value) => ({ id: value.id, name: value.name }),
    ),
);
```

Prefer direct `if (error) return [error, null]` branches for simple flows. Reach for `mapOk`, `mapErr`, `andThen`, `tapOk`, `tapErr`, and `fromNullable` when they make a pipeline easier to scan.

### yieldless/task

Structured concurrency. `runTaskGroup` shares an `AbortController` across spawned tasks. If one fails, the signal aborts siblings and the group waits for all children before rethrowing. If you already have an upstream `AbortSignal`, pass it in so the group inherits cancellation.

```ts
import { runTaskGroup } from "yieldless/task";

const requestController = new AbortController();

const result = await runTaskGroup(async (group) => {
  const user = group.spawn((signal) => loadUser(signal));
  const audit = group.spawn((signal) => writeAuditLog(signal));
  return await user;
}, {
  signal: requestController.signal,
});
```

### yieldless/resource

Native `AsyncDisposable` integration. The release function runs once when the scope exits.

```ts
import { acquireResource } from "yieldless/resource";

{
  await using db = await acquireResource(connect, disconnect);
  await db.value.query("select 1");
}
```

### yieldless/di

Dependency injection as a higher-order function. Binds dependencies, returns a function that only takes the remaining args.

```ts
import { inject } from "yieldless/di";

const run = inject(handler, { logger: console });
run("world"); // deps already bound
```

### yieldless/env

Environment variable helpers and schema-backed config parsing.

```ts
import { parseEnvSafe, pickEnv, readEnv } from "yieldless/env";

const [urlError, databaseUrl] = readEnv(process.env, "DATABASE_URL");
const [envError, env] = parseEnvSafe(
  envSchema,
  pickEnv(process.env, ["DATABASE_URL", "PORT"] as const),
);
```

Use `readEnv` for one-off required values, `readOptionalEnv` for optional values, and `parseEnvSafe` when config should be validated through a schema.

### yieldless/retry

Exponential backoff with abort-aware sleep. Operations must return `SafeResult`.

```ts
import { safeRetry } from "yieldless/retry";

const result = await safeRetry(
  (attempt, signal) => safeTry(fetchWithSignal(signal)),
  { maxAttempts: 5, baseDelayMs: 100 },
);
```

Options: `maxAttempts` (default 3), `baseDelayMs` (100), `maxDelayMs` (30000), `factor` (2), `jitter` ("full" | "none" | custom fn), `shouldRetry`, `onRetry`, `signal`.

### yieldless/signal

Deadline helpers for any abort-aware code.

```ts
import { withTimeout } from "yieldless/signal";

const response = await withTimeout(
  (signal) => fetch(url, { signal }),
  { timeoutMs: 5_000 },
);
```

Use `withTimeout` for one call and `createTimeoutSignal` when several operations need to share the same budget.

### yieldless/timer

Abort-aware sleep and polling helpers. Use these for small timing jobs, not as a scheduler.

```ts
import { poll, sleep } from "yieldless/timer";

await sleep(250, { signal });

const [error, job] = await poll(
  (_attempt, signal) => getJob(jobId, signal),
  { intervalMs: 1_000, timeoutMs: 30_000, signal },
);
```

Use `sleepSafe` when the wait belongs in tuple form. `poll` retries tuple-returning operations until success, `maxAttempts`, `shouldContinue` returning false, timeout, or abort.

### yieldless/fetch

Native `fetch()` helpers with tuple errors, status handling, JSON parsing, and timeout support.

```ts
import { fetchJsonSafe } from "yieldless/fetch";

const [error, body] = await fetchJsonSafe<{ ok: boolean }>(url, {
  timeoutMs: 5_000,
  signal,
});
```

Use `fetchSafe` when the caller needs the raw `Response`. Use `fetchJsonSafe` for JSON APIs. Non-ok responses become `HttpStatusError`; JSON parser failures become `JsonParseError`.

### yieldless/event

One-shot event waits for EventTarget-like and EventEmitter-like sources.

```ts
import { onceEventSafe } from "yieldless/event";

const [error, event] = await onceEventSafe(source, "ready", { signal });
```

Use `onceEvent` when promise rejection is natural, and `onceEventSafe` when the event wait belongs in tuple form. EventEmitter `error` events reject by default unless `rejectOn: false` is passed.

### yieldless/context

`AsyncLocalStorage` wrapper. Not a global container.

```ts
import { createContext, withSpan } from "yieldless/context";

const ctx = createContext<{ requestId: string }>();
await ctx.run({ requestId: crypto.randomUUID() }, async () => {
  console.log(ctx.expect().requestId);
});
```

`withSpan` works with any tracer exposing `startActiveSpan` (OpenTelemetry-compatible).

### yieldless/all

Parallel tuple combinators with shared abort. If one task or mapped item returns `[error, null]`, the signal aborts before returning.

```ts
import { all, mapLimit, race } from "yieldless/all";

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

Use `mapLimit` when processing a list of files, API calls, or subprocess jobs where unbounded parallelism would make the user's machine or service worse.

### yieldless/singleflight

Deduplicate concurrent tuple work by key. Use this when several callers may ask for the same expensive operation at once.

```ts
import { singleFlight } from "yieldless/singleflight";

const loadRepository = singleFlight(
  (signal, repoId: string) => readRepository(repoId, signal),
);
```

Results are not cached after settlement. Use `clear` or `clearAll` to abort in-flight entries.

### yieldless/schema

Adapts `safeParse()` and `parse()` validators (Zod, Valibot, etc.) into tuple results.

```ts
import { parseSafe } from "yieldless/schema";
const [err, user] = parseSafe(userSchema, input);
```

### yieldless/router

Turns tuple-returning handlers into HTTP `Response` objects for Hono.

```ts
import { honoHandler, NotFoundError } from "yieldless/router";

const getUser = honoHandler(async (c) => {
  const user = await loadUser(c.req.param("id"));
  if (!user) return [new NotFoundError("user not found"), null];
  return [null, user];
});
```

HTTP error classes: `BadRequestError`, `UnauthorizedError`, `ForbiddenError`, `NotFoundError`, `ConflictError`, `ValidationError`. Unknown errors become 500.

### yieldless/ipc

Electron IPC with tuple serialization. Errors are serialized to plain objects before crossing the boundary. For navigation-heavy UIs, the abortable IPC helpers let the renderer cancel stale main-process requests with `AbortSignal`.

```ts
import {
  createAbortableIpcBridge,
  createAbortableIpcMain,
  createAbortableIpcRenderer,
} from "yieldless/ipc";
```

### yieldless/node

Node.js `fs/promises` and `child_process` wrappers returning tuples.

```ts
import { readFileSafe, runCommandSafe } from "yieldless/node";

const [fileErr, contents] = await readFileSafe(".git/HEAD");
const [cmdErr, result] = await runCommandSafe("git", ["status", "--short"]);
```

`runCommandSafe` failures include captured `stdout`, `stderr`, and exit code. Passing `AbortSignal` kills the subprocess and waits for it to close.

## Rules

1. **Destructure tuples or fold them intentionally** -- use `const [err, value] = ...` while you are still in service code, or `match(result, { ok, err })` when converting the result into UI state.
2. **Check the error before using the value** -- `if (err) { handle; return; }` then use `value`.
3. **Pass AbortSignal through** -- every function that accepts a signal should forward it to downstream calls.
4. **Use subpath imports** -- `import { safeTry } from "yieldless/error"`, not from `"yieldless"`.
5. **`null` is the sentinel** -- `SafeResult` uses `null` in each slot. Do not use `null` as a meaningful success value.
6. **Prefer `ok` and `err` when returning tuples** -- `return err(error)` and `return ok(value)` are easier to scan than raw tuple literals in app code.
7. **Prefer `safeTry` over try/catch** -- wrap promise-returning calls with `safeTry` rather than adding try/catch blocks.
8. **Use `withTimeout` for firm deadlines** -- derive one signal and pass it through the transport instead of mixing ad hoc timers into business logic.
9. **Keep task group callbacks signal-aware** -- functions passed to `group.spawn` must accept and respect the `AbortSignal`.
10. **Use `await using` for resources** -- `acquireResource` returns an `AsyncDisposable`; use it with `await using` syntax.

## Project commands

```bash
pnpm build       # tsc compile to dist/
pnpm check       # type-check without emit
pnpm test        # vitest run
pnpm test:watch  # vitest watch mode
```

TypeScript 5.5+, strict mode, `isolatedDeclarations`, `verbatimModuleSyntax`, ESM only, target ES2022.
