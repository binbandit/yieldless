# `test/` Codemap

## Responsibility
Defines the behavioral contract for Yieldless. The tests focus on observable semantics rather than implementation details, which is important for a library built from small adapters.

## Design
The suite is organized by concern rather than by fixture-heavy integration scaffolding.

| File | Responsibility |
|------|----------------|
| `core.test.ts` | Error tuples, dependency injection, and resource cleanup basics. |
| `result.test.ts` | Tuple combinators for mapping, chaining, tapping, nullable conversion, and promise boundaries. |
| `env.test.ts` | Required/optional environment readers, key picking, and sync/async schema-backed environment parsing. |
| `concurrency.test.ts` | `all()`, `mapLimit()`, `race()`, and `runTaskGroup()` cancellation semantics. |
| `iterable.test.ts` | Sync/async iterable collection, sequential tuple workers, bounded mapping, first-error abort, and validation. |
| `queue.test.ts` | Bounded async queue order, backpressure, abort, close, and async iteration behavior. |
| `pubsub.test.ts` | Broadcast delivery, replay, subscription cleanup, and close behavior. |
| `schedule.test.ts` | Reusable schedule policies, composed stop/delay decisions, scheduled tuple loops, and validation. |
| `limiter.test.ts` | Semaphore concurrency, tuple permit wrappers, abortable acquisition, rate pacing, and queue clearing. |
| `retry.test.ts` | Retry termination, delay callbacks, and abort-aware backoff. |
| `signal.test.ts` | Timeout deadlines, inherited cancellation, and signal cleanup. |
| `timer.test.ts` | Abort-aware sleep, tuple sleep, polling stop conditions, timeout behavior, and option validation. |
| `event.test.ts` | EventTarget and EventEmitter one-shot waits, default error rejection, abort tuple wrapping, and listener cleanup. |
| `fetch.test.ts` | Native fetch wrappers, status errors, JSON parsing, custom status policies, and timeout propagation. |
| `cache.test.ts` | Cache hits/misses, in-flight deduplication, TTL expiry, LRU eviction, and abortable deletion. |
| `batcher.test.ts` | Batch coalescing, max-size flushing, shared errors, missing result errors, and abort cleanup. |
| `breaker.test.ts` | Circuit breaker state transitions, trip filters, open rejection, half-open recovery, and reset behavior. |
| `singleflight.test.ts` | In-flight deduplication, custom keys, tuple error normalization, entry clearing, and parent cancellation. |
| `adapters.test.ts` | Async context, schema adapters, router behavior, and IPC serialization. |
| `node.test.ts` | Filesystem wrappers, subprocess execution, shell commands, output streaming/limits, timeouts, and task-group subprocess cancellation. |
| `test.test.ts` | Deferred promise helpers, microtask flushing, controllable abort signals, and manual clock sleeps. |

## Data And Control Flow
1. Each test file imports the public module surface through package subpaths, not local internals.
2. Assertions concentrate on tuple shapes, abort propagation, and serialized boundary behavior.
3. The suite acts as a safety rail for keeping the library small without silently changing semantics.

## Integration Points
- Guards: the public API exported from `src/`.
- Executed by: `vitest` through the root `pnpm test` script.
