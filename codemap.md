# Repository Atlas: yieldless

## Project Responsibility
Yieldless is a deliberately small TypeScript library for engineers who want Effect-style ergonomics without adopting a custom runtime. Its core promise is that routine failures stay as `[error, value]` tuples while cancellation, cleanup, validation, HTTP edges, IPC boundaries, and Node I/O remain built on native platform primitives.

## Why This Repo Exists
The repo exists to make a specific backend coding style cheap to adopt:

- Keep operational failures explicit instead of throwing through normal control flow.
- Use `AbortSignal` for structured concurrency and cancellation instead of a scheduler or fiber runtime.
- Use native `await using` and `AsyncLocalStorage` instead of framework-owned lifecycle systems.
- Keep adapters thin so teams can layer Yieldless onto existing Node, HTTP, Electron, and schema tooling.

## System Entry Points
- `package.json`: package metadata, subpath exports, build/test scripts, and publishing surface.
- `src/index.ts`: barrel export for the full package entry while preserving granular subpath modules.
- `README.md`: high-level positioning, module tour, and design tradeoffs.
- `docs/`: docs site content and app shell for the public documentation.
- `skills/yieldless/SKILL.md`: agent-facing explanation of Yieldless conventions.

## Directory Map
| Directory | Responsibility Summary | Detailed Map |
|-----------|------------------------|--------------|
| `src/` | Core library modules for tuples, concurrency, adapters, and subpath exports. | [View Map](src/codemap.md) |
| `docs/` | Documentation site content, navigation, and Next.js app shell. | [View Map](docs/codemap.md) |
| `test/` | Contract tests that lock down the public API and cancellation semantics. | [View Map](test/codemap.md) |
| `skills/` | AI coding-agent skill that teaches Yieldless patterns and module usage. | [View Map](skills/codemap.md) |

## Data And Control Flow
1. Callers start in one small module such as `yieldless/error`, `yieldless/task`, or `yieldless/retry`.
2. Tuple results stay explicit through validation, retries, parallel work, bounded batch processing, and resource handling.
3. Deadline helpers and boundary adapters in `signal`, `router`, `ipc`, and `node` translate platform edges into the same tuple/cancellation contract.
4. The docs and skill package mirror that contract so humans and agents learn the same usage rules.

## Design Constraints
- No runtime dependencies in the published library.
- Favor current JavaScript and Node primitives over framework-owned abstractions.
- Keep modules orthogonal so consumers can import only the subpaths they need.
