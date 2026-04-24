# `docs/` Codemap

## Responsibility
Hosts the documentation site and long-form guidance that explain when to use Yieldless, how each module behaves, and what tradeoffs the library intentionally makes.

## Design
The docs combine content-heavy MDX reference pages with a small Next.js app shell.

| Area | Responsibility |
|------|----------------|
| `content/docs/` | Guides, recipes, and per-module reference pages. |
| `src/app/` | App routes, layouts, search endpoint, and OG image generation. |
| `src/components/` | MDX rendering, search UI, and provider wiring. |
| `src/lib/` | Shared source loading and layout helpers. |

## Data And Control Flow
1. MDX content under `content/docs/` defines the conceptual material and API reference.
2. `src/lib/source.ts` and related helpers load that content into the docs app.
3. App routes render the docs, home page, search endpoint, and LLM-oriented text exports.

## Integration Points
- Depends on: the published API shape in `src/`, especially examples that must stay synchronized with real exports.
- Supports: end users evaluating or adopting the library, plus agents consuming the `llms.txt` routes.
