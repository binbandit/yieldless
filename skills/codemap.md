# `skills/` Codemap

## Responsibility
Provides an agent-facing skill definition so AI coding assistants can understand Yieldless conventions, preferred imports, and the intent behind the library's tuple-based style.

## Design
The directory is intentionally small: `skills/yieldless/SKILL.md` is the durable onboarding document for agents.

## Data And Control Flow
1. An external skill installer links the skill into supported agent environments.
2. The skill teaches module boundaries, tuple conventions, and AbortSignal-driven patterns.
3. Agents use that context to generate code that matches the library's actual design rules.

## Integration Points
- Mirrors: the public API and design guidance from `README.md` and `docs/`.
- Supports: coding agents working inside projects that adopt Yieldless.
