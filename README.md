# JSON Unescape Studio

A two-pane JSON workbench that combines "paste an escaped string, get clean JSON"
with "paste JSON, get an escaped string literal" — plus beautify, minify, a tree
view, and a lenient repair pass for the JSON people actually paste.

**Everything runs in the browser.** There is no backend, no analytics and no
network call of any kind; the production build is a static bundle you can host
anywhere.

---

## Getting started

```bash
npm install
npm run dev        # http://localhost:5173
```

| Script | What it does |
| --- | --- |
| `npm run dev` | Vite dev server with HMR |
| `npm run build` | Type-checks, builds to `dist/`, then prerenders one static page per route |
| `npm run preview` | Serves the production build locally |
| `npm test` | Runs the Vitest unit suite once |
| `npm run test:watch` | Vitest in watch mode |
| `npm run typecheck` | Type-check only |
| `npm run prerender` | Re-run the prerender step against an existing `dist/` |
| `npm run verify:seo` | Audit the prerendered output (titles, meta, JSON-LD, links) |

Stack: Vite 5, React 18, TypeScript (strict), Tailwind CSS 3, CodeMirror 6
(`@uiw/react-codemirror` + `@codemirror/lang-json`).

---

## The four modes

### 1. Unescape → JSON (the primary mode)

Takes a stringified/escaped JSON document and gives back pretty-printed JSON.
It is deliberately tolerant of the mess that real payloads arrive in:

* **Multiply-escaped strings.** `JSON.parse` is attempted after every pass, up to
  **5 passes**, stopping at the first pass that yields an object or array. The
  status bar reports how many passes were applied.
* **Wrapping quotes.** A matching outer pair of `"` or `'` is stripped.
* **Escape sequences.** `\"`, `\\`, `\/`, `\n`, `\r`, `\t`, `\b`, `\f` and
  `\uXXXX` are all decoded. An unknown escape such as `\q` collapses to `q`,
  which is nearly always what the payload meant.
* **Log-pasted JSON.** A leading timestamp, log level or label
  (`response:`, `payload =`, …) before the first `{`, `[`, `"` or `'` is removed.
  The prefix is only stripped when it contains no JSON punctuation of its own,
  so real content is never eaten.

### 2. JSON → Stringify

Parses the input, re-serialises it with the current indentation and key-order
settings, then escapes the result into a string literal. Two extra toggles
appear in the toolbar for this mode:

* **Wrap in quotes** — include the surrounding `"` (on by default).
* **Escape non-ASCII** — emit `\uXXXX` for every character above `U+007E`.

### 3. Beautify

Pretty-prints valid JSON using the selected indentation.

### 4. Minify

Strips all insignificant whitespace.

### Auto-detect

On by default. It inspects the input and picks the mode:

1. Text that starts with `{` or `[` **and parses** → **Beautify**.
   (Checked first, so a valid document containing `\n` inside a string is not
   mistaken for an escaped one.)
2. NDJSON → **Beautify**.
3. Quote-wrapped input, or input carrying `\"` / `\\n`-style escapes →
   **Unescape**.
4. Anything that parses to a JSON string → **Unescape**.
5. Otherwise, log-prefixed or backslash-bearing text → **Unescape**.

Picking a mode by hand switches auto-detect off.

---

## Lenient repair (opt-in, off by default)

The repair pass rewrites the input with a small scanner and reports every fix it
made, so nothing changes silently. It handles:

| Problem | Fix |
| --- | --- |
| `{"a":1,}` / `[1,2,]` | Trailing comma removed |
| `{'a':'b'}` | Single-quoted strings converted to double quotes |
| `{a:1}` | Unquoted keys quoted |
| `{"a":active}` | Unquoted values quoted |
| `None` / `True` / `False` | `null` / `true` / `false` |
| `NaN`, `Infinity`, `undefined` | `null` |
| `// line` and `/* block */` comments | Removed |

Escape sequences and `\uXXXX` inside strings survive the pass untouched, and raw
newlines/tabs found inside a string are re-escaped so the result is valid JSON.

When a parse fails **and** the repair pass would have fixed it, the error banner
offers a **Try to fix automatically** button, which turns the toggle on.

## NDJSON / JSON Lines

If every non-blank line parses as its own JSON document, the input is treated as
NDJSON. With **Wrap NDJSON** on (the default) the documents are combined into an
array; with it off you get a note telling you what was detected.

---

## Errors

A failed parse is reported in a non-blocking banner above the output pane — never
a modal or an `alert` — with:

* the engine message rewritten to name the **line and column**
  (`Unexpected token } at line 14, column 3`),
* a one-line **hint** at the likely cause (trailing comma, single quotes,
  unquoted property name, Python literal, unclosed bracket…),
* an inline **CodeMirror diagnostic** marking the offending character in the
  input editor,
* and the automatic-repair button when repair would help.

---

## Output pane

* **Formatted** — read-only CodeMirror with syntax highlighting, folding and
  bracket matching.
* **Tree** — collapsible nodes with type badges (string / number / boolean /
  null / object / array), item and key counts on containers, expand-all and
  collapse-all, a search box that filters to matching branches and highlights the
  match, and a **copy path** action on every row that yields a JSON path such as
  `data.users[0].email`.

Indentation (2 spaces / 4 spaces / tab) and alphabetical key sorting apply to
every mode that emits JSON.

---

## Performance

Large inputs never block the UI:

* conversion is **debounced 300 ms** after typing stops;
* parsing and formatting run in a **Web Worker** (`src/worker/convert.worker.ts`),
  with a synchronous fallback where workers are unavailable;
* stale worker responses are discarded, so only the newest result is rendered;
* the tree view is **virtualised** — only rows inside the viewport are mounted;
* a spinner covers the output pane while a conversion is in flight;
* above **5 MB** auto-conversion pauses and a **Convert** button appears.


---

## Pages and SEO

The app ships as **seven static HTML pages**, one per search intent, rather than a
single-page app behind one URL. Every route is a real file with its own title,
meta description, canonical URL, social tags, JSON-LD and visible copy, so a
crawler sees the full page without executing any JavaScript. Opening a route
also preselects the matching conversion mode.

| Route | Mode | Targets |
| --- | --- | --- |
| `/` | Unescape | json unescape, unescape json string |
| `/json-stringify` | Stringify | json stringify online, json escape |
| `/json-formatter` | Beautify | json formatter, json validator, pretty print json |
| `/json-minify` | Minify | json minifier, compress json |
| `/ndjson-to-json` | Beautify | ndjson to json, json lines converter |
| `/json-repair` | Beautify | fix invalid json, trailing comma, single quotes |
| `/double-escaped-json` | Unescape | double escaped json, escaped twice |

`src/lib/routes.ts` is the single source of truth: it defines the path, the
starting mode, the metadata and the copy, and is consumed both by the React app
(`src/App.tsx`) and by the build script (`scripts/prerender.mjs`). Adding a page
means adding one entry there — nothing else needs to change.

### Build output

`npm run build` runs `tsc --noEmit`, then `vite build`, then
`scripts/prerender.mjs`, which writes:

```
dist/index.html                     /
dist/json-stringify/index.html      /json-stringify
dist/json-formatter/index.html      ...
dist/sitemap.xml
dist/robots.txt
```

Set the canonical origin at build time:

```bash
SITE_URL=https://your-domain.com npm run build
```

It defaults to the `SITE_URL` constant in `src/lib/routes.ts`.

### Deploying

The build is plain static files, so any static host works. `public/_headers`
ships cache rules that Cloudflare Pages and Netlify both read (other hosts
ignore the file): hashed assets are cached for a year as immutable, HTML always
revalidates so a deploy is live immediately.

**Cloudflare Pages** is the recommended host for this project: the free plan has
unlimited bandwidth and unlimited static requests, allows commercial use, and
includes a custom domain with automatic TLS. Build command `npm run build`,
output directory `dist`.

**Do not add an SPA catch-all rewrite** (`/* -> /index.html`). It would serve the
root page's title and copy for every URL and undo the whole point of the
prerender step. A 404 fallback is fine; a catch-all rewrite is not.

#### GitHub Pages

`.github/workflows/deploy.yml` builds and publishes on every push to `main`.
Enable it once under **Settings → Pages → Build and deployment → Source:
GitHub Actions**.

By default it publishes to `https://<owner>.github.io/<repo>/`. Because that is
a subpath, the build needs a matching base path — the workflow derives it from
the repository name, and `vite.config.ts` derives Vite's `base` from `SITE_URL`
so the asset URLs, the canonical tags and the internal links cannot drift apart.

To move to a custom domain, add it under **Settings → Pages → Custom domain**
and set these repository variables (**Settings → Secrets and variables →
Actions → Variables**):

| Variable | Value |
| --- | --- |
| `SITE_URL` | `https://your-domain.com` |
| `BASE_PATH` | `/` |
| `TRAILING_SLASH` | `1` |

Two caveats specific to project-page hosting. `robots.txt` is only honoured at a
domain root, so on `<owner>.github.io/<repo>/` crawlers read the account-level
file and ignore the one this build emits — a custom domain fixes that. And
`public/_headers` does nothing on GitHub Pages, which does not support custom
cache headers.

#### Trailing slashes

Static hosts disagree about how to serve `dist/foo/index.html`. Most serve it at
`/foo`; some serve it at `/foo/` and redirect `/foo` to it. A canonical URL that
the host then redirects wastes crawl budget, so the form is a build flag.

The default omits the trailing slash. After the first deploy, check which form
your host serves directly:

```bash
curl -sI https://your-domain.com/json-stringify | head -1
```

`200` means the default is correct. A `301`, `307` or `308` means rebuild with:

```bash
TRAILING_SLASH=1 SITE_URL=https://your-domain.com npm run build
```

The flag moves the canonical tag, `og:url`, the sitemap entries and the
prerendered internal links together, so they never disagree.

### Checking your work

`npm run verify:seo` audits `dist/` and exits non-zero on anything that would
hurt indexing: a title over 62 characters, a description outside 110–175, a
missing canonical, more or fewer than one `<h1>`, invalid JSON-LD, fewer than
220 words of crawlable copy, a broken asset path, or two pages sharing a title
or description. Wire it into CI next to the unit tests.

---

## Keyboard shortcuts

| Shortcut | Action |
| --- | --- |
| `Ctrl`/`⌘` + `Enter` | Convert now |
| `Ctrl`/`⌘` + `K` | Clear both panes |
| `Ctrl`/`⌘` + `Shift` + `C` | Copy the output |
| `Ctrl`/`⌘` + `S` | Download the output |
| `?` | Show/hide the shortcut list |
| `Esc` | Close the shortcut list |

## Persistence and theming

The last input, mode, indentation, split ratio and output view are kept in
`localStorage`, so a refresh does not lose work. The theme follows the system
preference on first visit and is remembered afterwards; an inline script in
`index.html` applies it before first paint so there is no flash.

---

## Accessibility

Full keyboard navigation (the split divider is a focusable `separator` that
responds to arrow keys and `Home`), ARIA labels on every icon-only button,
`aria-live="polite"` on the status bar and the error banner, visible focus rings,
and WCAG AA contrast in both themes. `prefers-reduced-motion` disables the
transitions.

---

## Project layout

```
src/
  lib/                 pure, framework-free conversion logic (unit-tested)
    detect.ts          mode detection, log-prefix stripping, NDJSON splitting
    unescape.ts        multi-pass unescaping and escape decoding
    stringify.ts       string-literal escaping
    repair.ts          lenient repair scanner
    format.ts          indent/sort/measure helpers
    jsonError.ts       error position + hint derivation
    tree.ts            flatten/expand helpers for the tree view
    convert.ts         the single orchestrator used by the UI, the worker and tests
    samples.ts         the built-in "Load sample" documents
    __tests__/         Vitest suites
  worker/              the conversion Web Worker
  hooks/               theme, persisted state, converter driver
  components/          UI
```

`src/lib` imports nothing from React, so the whole conversion surface is testable
on its own.

## Tests

```bash
npm test
```

84 unit tests cover single-, double- and triple-escaped input, hand-written
escaped literals, quote-wrapped input, log prefixes, unicode escapes, the
five-pass ceiling, trailing commas, single quotes, unquoted keys and values,
Python literals, comments, empty input, already-valid JSON, NDJSON, stringify
options, indentation and key sorting, error line/column reporting, tree
flattening and search, and documents nested 120–500 levels deep.
