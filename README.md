# Yieldless

Yieldless is a small TypeScript library for people who like the ergonomics of Effect-style code but do not want a custom runtime in the middle of everything.

The library is built around four ideas:

- error handling as simple tuples
- structured concurrency through `AbortController`
- resource cleanup through native `await using`
- dependency injection through plain functions

The next layer adds practical backend pieces on top of those primitives:

- retry loops with abort-aware backoff

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

## Development

```bash
pnpm install
pnpm build
pnpm check
pnpm test
```
