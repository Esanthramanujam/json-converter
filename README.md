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
| `npm run build` | Type-checks with `tsc --noEmit`, then builds to `dist/` |
| `npm run preview` | Serves the production build locally |
| `npm test` | Runs the Vitest unit suite once |
| `npm run test:watch` | Vitest in watch mode |
| `npm run typecheck` | Type-check only |

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
