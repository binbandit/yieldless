# `src/` Codemap

## Responsibility
Implements the published Yieldless library: tuple primitives, structured-concurrency helpers, boundary adapters, and the barrel exports that assemble the package surface.

## Design
The source tree follows a flat module-per-capability layout. Each file owns one small abstraction and is exported as both a direct subpath and through `src/index.ts`.

| Module | Responsibility |
|--------|----------------|
| `error.ts` | Defines `SafeResult` plus tuple capture and unwrap helpers. |
| `result.ts` | Provides small tuple combinators for mapping, chaining, tapping, nullable conversion, and promise boundaries. |
| `task.ts` | Implements structured concurrency with sibling cancellation and upstream abort inheritance. |
| `resource.ts` | Wraps acquire/release pairs in an `AsyncDisposable` compatible object. |
| `di.ts` | Binds plain dependency objects onto functions without a container. |
| `env.ts` | Reads required/optional environment variables and adapts schema-backed config parsing into tuples. |
| `retry.ts` | Runs tuple operations with exponential backoff and abort-aware timers. |
| `signal.ts` | Builds disposable deadline signals and timeout wrappers for abort-aware work. |
| `timer.ts` | Provides abort-aware sleep, tuple sleep, and fixed-interval polling. |
| `event.ts` | Waits for one EventTarget/EventEmitter event with abort-aware listener cleanup. |
| `fetch.ts` | Wraps native fetch with tuple errors, timeouts, status checks, and JSON parsing. |
| `context.ts` | Wraps `AsyncLocalStorage` and trace-span lifecycles. |
| `all.ts` | Provides tuple-native `all()`, `race()`, and bounded `mapLimit()` combinators with shared cancellation. |
| `cache.ts` | Implements TTL/LRU tuple caches with in-flight load sharing and abortable refresh/delete. |
| `batcher.ts` | Coalesces nearby keyed loads into tuple-returning batch operations. |
| `breaker.ts` | Wraps tuple operations with a small circuit breaker for flaky dependencies. |
| `iterable.ts` | Processes sync/async iterables with tuple collection, sequential workers, and bounded mapping. |
| `queue.ts` | Implements a bounded async queue with abortable offer/take operations and async iteration. |
| `pubsub.ts` | Provides in-process broadcast subscriptions with optional replay and clean close behavior. |
| `singleflight.ts` | Deduplicates concurrent tuple work by key and exposes abortable in-flight entry clearing. |
| `schedule.ts` | Defines reusable delay/stop policies for retries, polling, and repeated tuple work. |
| `limiter.ts` | Provides semaphores, permit-wrapped tuple work, and simple rate limiting. |
| `schema.ts` | Adapts `parse` and `safeParse` style validators into tuple results. |
| `router.ts` | Converts tuple handlers into Hono-style JSON responses and HTTP errors. |
| `ipc.ts` | Preserves tuple success and error payloads across Electron IPC boundaries. |
| `node.ts` | Wraps common filesystem and child-process calls in tuple-returning adapters. |
| `test.ts` | Provides deferred promises, microtask flushing, controllable signals, and a manual clock for tests. |
| `index.ts` | Re-exports types and functions for the top-level package import. |

## Data And Control Flow
1. `error.ts` establishes the tuple contract shared across the repo.
2. Control-flow helpers like `task.ts`, `retry.ts`, `context.ts`, `all.ts`, `schedule.ts`, and `limiter.ts` compose around that contract while forwarding `AbortSignal`, including bounded batch work through `mapLimit()`.
3. Boundary modules adapt external APIs into tuple form instead of introducing another result type.
4. `index.ts` exposes the same modules as a coherent package while preserving direct subpath imports for tree-shaking and mental clarity.

## Integration Points
- Consumed by: application code importing `yieldless` or `yieldless/*` subpaths.
- Validated by: [test/codemap.md](../test/codemap.md) contract tests.
- Documented by: [docs/codemap.md](../docs/codemap.md) and `README.md`.
