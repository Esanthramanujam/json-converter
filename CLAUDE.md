# CLAUDE.md

Guidance for working in this repo.

## What it is

**JSON Unescape Studio** — a client-side JSON tool (unescape, stringify, format,
minify, NDJSON→array, repair, double-escape decode). React + Vite + TypeScript +
Tailwind. No backend: everything runs in the browser, conversion off the main
thread in a Web Worker. Deployed to GitHub Pages as prerendered static HTML, one
page per tool for SEO.

## Commands

```
npm run dev         # vite dev server
npm test            # vitest run (unit tests in src/lib/__tests__)
npm run typecheck   # tsc --noEmit
npm run build       # typecheck + vite build + prerender (see scripts/prerender.mjs)
npm run verify:seo  # scripts/verify-seo.mjs — checks prerendered output
```

`SITE_URL` / `BASE_PATH` / `TRAILING_SLASH` env vars drive deployment paths
(GitHub Pages project sites live under `/<repo>/`). CI: `.github/workflows/deploy.yml`.

## Architecture

- **`src/lib/convert.ts`** — the single pure entry point (`convert(input, options)`).
  Used by the UI, the worker, and the tests. Same input → same output. Start here.
- **`src/lib/`** — the engine, all pure & tested: `detect` (mode/NDJSON/log-prefix),
  `unescape` (up to 5 passes), `repair` (char-level lenient fixer), `stringify`,
  `format` (indent/sort/minify + stats), `tree` (flatten to rows for TreeView),
  `jsonError` (line/col + hints), `types` (shared types & `DEFAULT_OPTIONS`).
- **`src/lib/routes.ts`** — single source of truth for the 7 tool pages: mode,
  SEO title/description, body copy, FAQ. Shared between the React app (`ACTIVE_ROUTE`
  picks the mode from the served path) and the prerender script.
- **`src/worker/convert.worker.ts`** — wraps `convert` off-thread; `useConverter`
  falls back to sync when Worker is unavailable (tests/SSR/old browsers).
- **`src/hooks/useConverter.ts`** — debounces (300ms), tracks request IDs so stale
  worker responses are dropped, and gates inputs >5MB behind a manual Convert.
- **`src/App.tsx`** — wires state (persisted via `usePersistentState`), keyboard
  shortcuts, mobile vs split layout. Components in `src/components/` are presentational.
- **`scripts/prerender.mjs`** — post-build: emits real HTML per route (title, meta,
  canonical, JSON-LD, visible copy), plus sitemap.xml and robots.txt.

## Conventions

- Logic lives in `src/lib` as pure functions with tests; components stay dumb.
- Adding a tool page = add a `RouteDef` to `routes.ts`; the app and prerender pick
  it up. Mode behavior goes in `convert.ts` and the relevant lib module.
- `strict` TS, `noUnusedLocals`/`noUnusedParameters` on — keep it clean.
- Every non-trivial lib change gets a test in `src/lib/__tests__`.
