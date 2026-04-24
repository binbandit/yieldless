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
| `schedule.test.ts` | Reusable schedule policies, composed stop/delay decisions, scheduled tuple loops, and validation. |
| `limiter.test.ts` | Semaphore concurrency, tuple permit wrappers, abortable acquisition, rate pacing, and queue clearing. |
| `retry.test.ts` | Retry termination, delay callbacks, and abort-aware backoff. |
| `signal.test.ts` | Timeout deadlines, inherited cancellation, and signal cleanup. |
| `timer.test.ts` | Abort-aware sleep, tuple sleep, polling stop conditions, timeout behavior, and option validation. |
| `event.test.ts` | EventTarget and EventEmitter one-shot waits, default error rejection, abort tuple wrapping, and listener cleanup. |
| `fetch.test.ts` | Native fetch wrappers, status errors, JSON parsing, custom status policies, and timeout propagation. |
| `singleflight.test.ts` | In-flight deduplication, custom keys, tuple error normalization, entry clearing, and parent cancellation. |
| `adapters.test.ts` | Async context, schema adapters, router behavior, and IPC serialization. |
| `node.test.ts` | Filesystem wrappers, subprocess execution, and task-group subprocess cancellation. |

## Data And Control Flow
1. Each test file imports the public module surface through package subpaths, not local internals.
2. Assertions concentrate on tuple shapes, abort propagation, and serialized boundary behavior.
3. The suite acts as a safety rail for keeping the library small without silently changing semantics.

## Integration Points
- Guards: the public API exported from `src/`.
- Executed by: `vitest` through the root `pnpm test` script.
