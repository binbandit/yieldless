# Yieldless

Yieldless is a small TypeScript library for people who like the ergonomics of Effect-style code but do not want a custom runtime in the middle of everything.

Full documentation lives at <https://binbandit.github.io/yieldless/>.

The docs site also publishes agent-friendly context:

- <https://binbandit.github.io/yieldless/llms.txt> for a compact index of guides, reference pages, recipes, and per-page Markdown links
- <https://binbandit.github.io/yieldless/llms-full.txt> for the full documentation corpus as Markdown-oriented text

The library is built around six ideas:

- error handling as simple tuples
- readable tuple pipelines without a DSL
- structured concurrency through `AbortController`
- resource cleanup through native `await using`
- dependency injection through plain functions
- configuration parsing as ordinary data

The next layer adds practical backend pieces on top of those primitives:

- retry loops with abort-aware backoff
- reusable schedule policies for retries, polling, and custom repeat loops
- deadline helpers for any abort-aware operation
- abort-aware sleep and polling
- fetch helpers with status, timeout, and JSON handling
- result combinators for success/error pipelines
- environment readers and schema-backed config parsing
- abort-aware one-shot event waits
- async context storage for request-scoped data and spans
- tuple-native parallel and bounded-work combinators
- sync and async iterable workflows
- async queues and pub/sub fanout
- semaphores and rate limiters for shared capacity
- TTL/LRU caches with shared in-flight loads
- DataLoader-style keyed batching
- circuit breakers for protecting flaky dependencies
- in-flight request deduplication
- schema adapters that stay in tuple-land
- route handlers that turn tuple errors into HTTP responses
- IPC bridges that keep tuple results intact across Electron boundaries
- Node filesystem and subprocess wrappers that return tuples
- async test helpers for controllable promises, clocks, and signals

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

### `yieldless/schedule`

`yieldless/schedule` separates repeat policy from the operation being retried or polled. Reach for it when `safeRetry()` is too specific and you want reusable delay, attempt, or elapsed-time rules.

```ts
import { safeTry } from "yieldless/error";
import {
  composeSchedules,
  exponentialBackoff,
  maxAttempts,
  runScheduled,
} from "yieldless/schedule";

const [error, response] = await runScheduled(
  (_attempt, signal) => safeTry(fetch("https://api.example.com/jobs", { signal })),
  composeSchedules(
    maxAttempts(5),
    exponentialBackoff({ baseDelayMs: 100, maxDelayMs: 2_000 }),
  ),
  { signal },
);
```

Good schedules describe policy, not business logic. Keep the operation responsible for deciding whether a tuple error should be retried.

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

### `yieldless/queue`

`createQueue` gives producers and workers a tiny bounded async queue with tuple errors, abortable waits, and async iteration.

```ts
import { createQueue } from "yieldless/queue";

const jobs = createQueue<Job>({ capacity: 100 });

await jobs.offer({ id: "index-readme" }, { signal });

for await (const job of jobs) {
  await processJob(job, signal);
}
```

Bound queues when producers can outpace consumers. An unbounded queue is fine for short-lived in-memory handoff, but it should not hide sustained overload.

### `yieldless/pubsub`

`createPubSub` fans events out to independent async subscribers. Each subscriber gets its own queue, so a slow consumer does not block publishers.

```ts
import { createPubSub } from "yieldless/pubsub";

const events = createPubSub<{ type: string; id: string }>({ replay: 1 });
const subscription = events.subscribe();

events.publish({ type: "repository.indexed", id: "yieldless" });

for await (const event of subscription) {
  await sendWebhook(event);
}
```

Use pub/sub for in-process notifications. If events must survive restarts, use a durable broker at the edge and keep Yieldless for local flow control.

### `yieldless/limiter`

`createSemaphore` and `createRateLimiter` keep shared services from being overwhelmed without introducing a worker runtime.

```ts
import { withPermit, createSemaphore, createRateLimiter } from "yieldless/limiter";

const database = createSemaphore(8);
const api = createRateLimiter({ limit: 20, intervalMs: 1_000 });

await api.take({ signal });

const [error, user] = await withPermit(
  database,
  (scopedSignal) => loadUser(userId, scopedSignal),
  { signal },
);
```

Prefer a semaphore for concurrent capacity and a rate limiter for time-window budgets. They solve different pressure problems and compose cleanly.

### `yieldless/cache`

`createCache` is a small TTL/LRU read-through cache. It shares duplicate in-flight loads, stores only successful tuple results, and lets abort signals cancel the underlying loader.

```ts
import { createCache } from "yieldless/cache";
import { fetchJsonSafe } from "yieldless/fetch";

const users = createCache<string, User>({
  ttlMs: 30_000,
  maxSize: 500,
  load: (id, signal) => fetchJsonSafe<User>(`/api/users/${id}`, { signal }),
});

const [error, user] = await users.get(userId, { signal });
```

Cache stable reads, not commands. Failed loads are returned to callers but are not cached, so transient outages do not poison the next request.

### `yieldless/batcher`

`createBatcher` collects nearby keyed reads into one ordered batch. It is useful for GraphQL resolvers, route loaders, and UI hydration paths that otherwise create N+1 calls.

```ts
import { createBatcher } from "yieldless/batcher";

const userBatcher = createBatcher<string, User>({
  waitMs: 2,
  maxBatchSize: 100,
  loadMany: (ids, signal) => loadUsersById(ids, signal),
});

const [error, user] = await userBatcher.load(userId, { signal });
```

Batchers are intentionally not caches. Put `yieldless/cache` in front when repeated keys should be remembered after the batch settles.

### `yieldless/breaker`

`createCircuitBreaker` stops repeatedly calling a dependency that is already failing. It returns `CircuitOpenError` while the circuit is open, then probes again after the cooldown.

```ts
import { createCircuitBreaker, CircuitOpenError } from "yieldless/breaker";
import { fetchJsonSafe } from "yieldless/fetch";

const loadUser = createCircuitBreaker(
  (signal, id: string) => fetchJsonSafe<User>(`/api/users/${id}`, { signal }),
  { failureThreshold: 3, cooldownMs: 10_000 },
);

const [error, user] = await loadUser(userId);

if (error instanceof CircuitOpenError) {
  return [error, null] as const;
}
```

Breakers are for protecting dependencies and callers during outages. They should sit near the boundary they protect, not around ordinary domain functions.

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
import { readFileSafe, runCommandSafe, runShellCommandSafe } from "yieldless/node";

const [fileError, contents] = await readFileSafe(".git/HEAD");

const [testError, testResult] = await runCommandSafe("pnpm", ["test"], {
  cwd: workspacePath,
  maxOutputBytes: 1024 * 1024,
  onStdout: (chunk) => process.stdout.write(chunk),
  timeoutMs: 60_000,
});

const [shellError, shellResult] = await runShellCommandSafe(
  "pnpm test -- --runInBand",
  { cwd: workspacePath, timeoutMs: 60_000 },
);
```

Command failures come back as tuple errors with captured `stdout`, `stderr`, exit status, duration, and command metadata instead of rejected promises.

If you pass an `AbortSignal` or `timeoutMs`, the subprocess is terminated through Node's native child-process cancellation support and the wrapper does not settle until the child has actually closed. Use `runCommandSafe(file, args)` for safe argument boundaries, and reserve `runShellCommandSafe()` for trusted shell syntax like pipes, redirects, and developer-authored command strings.

### `yieldless/test`

`yieldless/test` provides tiny async test helpers for library and app code that uses promises, abort signals, and timers.

```ts
import { createManualClock, createTestSignal, deferred } from "yieldless/test";

const ready = deferred<void>();
const testSignal = createTestSignal();
const clock = createManualClock();

const wait = clock.sleep(1_000, { signal: testSignal.signal });

clock.tick(1_000);
ready.resolve();

await Promise.all([ready.promise, wait]);
```

Use these helpers to make async behavior explicit in unit tests instead of relying on real time or unobserved promise races.

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
pnpm --dir docs types:check
```
