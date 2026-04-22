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

Foundation. Wraps promises and sync functions into tuples.

```ts
import { safeTry, safeTrySync, unwrap } from "yieldless/error";

const [err, body] = await safeTry(fetch(url));
const [parseErr, data] = safeTrySync(() => JSON.parse(raw));
const value = unwrap(result); // rethrows if error
```

### yieldless/task

Structured concurrency. `runTaskGroup` shares an `AbortController` across spawned tasks. If one fails, the signal aborts siblings and the group waits for all children before rethrowing.

```ts
import { runTaskGroup } from "yieldless/task";

const result = await runTaskGroup(async (group) => {
  const user = group.spawn((signal) => loadUser(signal));
  const audit = group.spawn((signal) => writeAuditLog(signal));
  return await user;
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

Parallel tuple combinators with shared abort. If one task returns `[error, null]`, the signal aborts before returning.

```ts
import { all, race } from "yieldless/all";

const result = await all([
  (signal) => readPrimary(signal),
  (signal) => readReplica(signal),
]);
```

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

Electron IPC with tuple serialization. Errors are serialized to plain objects before crossing the boundary.

```ts
import { createIpcMain, createIpcRenderer } from "yieldless/ipc";
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

1. **Always destructure tuples** -- use `const [err, value] = ...`, never ignore the error slot.
2. **Check the error before using the value** -- `if (err) { handle; return; }` then use `value`.
3. **Pass AbortSignal through** -- every function that accepts a signal should forward it to downstream calls.
4. **Use subpath imports** -- `import { safeTry } from "yieldless/error"`, not from `"yieldless"`.
5. **`null` is the sentinel** -- `SafeResult` uses `null` in each slot. Do not use `null` as a meaningful success value.
6. **Prefer `safeTry` over try/catch** -- wrap promise-returning calls with `safeTry` rather than adding try/catch blocks.
7. **Keep task group callbacks signal-aware** -- functions passed to `group.spawn` must accept and respect the `AbortSignal`.
8. **Use `await using` for resources** -- `acquireResource` returns an `AsyncDisposable`; use it with `await using` syntax.

## Project commands

```bash
pnpm build       # tsc compile to dist/
pnpm check       # type-check without emit
pnpm test        # vitest run
pnpm test:watch  # vitest watch mode
```

TypeScript 5.5+, strict mode, `isolatedDeclarations`, `verbatimModuleSyntax`, ESM only, target ES2022.
