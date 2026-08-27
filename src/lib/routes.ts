import type { Mode } from './types';

export interface FaqItem {
  q: string;
  a: string;
}

export interface RouteDef {
  /** URL path. Also the directory the prerender step writes to. */
  path: string;
  /** Short label used in the cross-tool navigation. */
  label: string;
  /** Mode the app starts in when this route is opened. */
  mode: Mode;
  /** Leave auto-detect on for the landing page; pin the mode on tool pages. */
  autoDetect: boolean;
  /** <title>. Keep under ~60 characters so it is not truncated in results. */
  title: string;
  /** <meta name="description">. Aim for 140-160 characters. */
  description: string;
  h1: string;
  /** One or two sentences rendered directly under the H1. */
  intro: string;
  /** Body copy paragraphs. Unique per route - no boilerplate reuse. */
  body: string[];
  faq: FaqItem[];
}

/** Canonical origin. Override at build time with SITE_URL=https://example.com. */
export const SITE_URL = 'https://jsonunescape.com';
export const SITE_NAME = 'JSON Unescape';

export const ROUTES: RouteDef[] = [
  {
    path: '/',
    label: 'Unescape JSON',
    mode: 'unescape',
    autoDetect: true,
    title: 'JSON Unescape — Unescape Escaped JSON Strings Online',
    description:
      'Paste an escaped or stringified JSON string and get clean, formatted JSON back. Handles double-escaped payloads, \\uXXXX, and JSON buried in log lines. Runs entirely in your browser.',
    h1: 'Unescape JSON',
    intro:
      'Turn an escaped JSON string — the kind that comes out of a log file, a database column or a nested API response — back into readable, formatted JSON.',
    body: [
      'When a JSON document is stored inside another string, every quote in it gets a backslash in front of it. Copy that value out and you get an unreadable line of \\" and \\n instead of a document you can scan. This tool reverses that: it parses the string, decodes the escape sequences, and pretty-prints whatever was inside.',
      'It retries after every pass, up to five, so a payload that was stringified more than once still comes out clean, and it tells you how many passes it needed. Matching outer quotes are stripped, \\", \\\\, \\/, \\n, \\r, \\t, \\b, \\f and \\uXXXX are all decoded, and a leading timestamp or log level in front of the payload is removed before parsing.',
      'Nothing is uploaded. The conversion runs in a Web Worker inside your own browser, which means you can paste production payloads without them leaving the machine.',
    ],
    faq: [
      {
        q: 'What does it mean to unescape JSON?',
        a: 'Unescaping JSON means reversing the backslash escape sequences that were added when a JSON document was stored inside a string. \\" becomes ", \\n becomes a real newline, and \\u00e9 becomes é — leaving you with the original document.',
      },
      {
        q: 'Can it handle JSON that was escaped more than once?',
        a: 'Yes. Each pass attempts a parse, and the tool keeps going for up to five passes, stopping at the first one that yields a valid object or array. The number of passes applied is shown in the status bar.',
      },
      {
        q: 'Is my data sent to a server?',
        a: 'No. There is no backend and no analytics. All parsing and formatting happens client-side in your browser, so nothing you paste is transmitted anywhere.',
      },
    ],
  },
  {
    path: '/json-stringify',
    label: 'Stringify JSON',
    mode: 'stringify',
    autoDetect: false,
    title: 'JSON Stringify Online — Escape JSON to a String Literal',
    description:
      'Convert JSON into an escaped string literal you can paste into code, a test fixture or a config field. Toggle the surrounding quotes and \\uXXXX escaping for non-ASCII characters.',
    h1: 'JSON Stringify Online',
    intro:
      'Escape a JSON document into a single string literal — the same result as JSON.stringify() on the text, ready to embed in source code, a test fixture or a config value.',
    body: [
      'Embedding a JSON document inside another string means escaping every quote, backslash and newline it contains. Doing that by hand is where typos come from. Paste the JSON here and the escaped literal comes out the other side, correct the first time.',
      'Two toggles change the shape of the result. "Wrap in quotes" controls whether the surrounding double quotes are included — turn it off when you are pasting into an existing string. "Escape non-ASCII" emits \\uXXXX for every character above U+007E, which is what you want for a file that has to stay pure ASCII.',
      'Indentation is applied before escaping, so switching to Minify first gives you a compact one-line literal, while 2 or 4 spaces preserves the formatting as \\n sequences inside the string.',
    ],
    faq: [
      {
        q: 'What is the difference between stringify and escape?',
        a: 'They describe the same operation from different angles. Stringifying a JSON document produces a string literal; escaping is the character-level work that makes that literal valid. This page does both, and the "Wrap in quotes" toggle decides whether you get the surrounding quotes.',
      },
      {
        q: 'How do I get a compact one-line result?',
        a: 'Run the input through Minify first, then stringify it. Because indentation is applied before escaping, minified input produces a literal with no \\n sequences at all.',
      },
      {
        q: 'When should I escape non-ASCII characters?',
        a: 'Turn it on when the result has to survive a system that is not UTF-8 safe — some CI variables, older config parsers and ASCII-only source files. Accented letters and dashes become \\u00e9 and \\u2014 instead of literal characters.',
      },
    ],
  },
  {
    path: '/json-formatter',
    label: 'Format JSON',
    mode: 'beautify',
    autoDetect: false,
    title: 'JSON Formatter & Validator — Pretty Print JSON Online',
    description:
      'Format and validate JSON with 2-space, 4-space or tab indentation, alphabetical key sorting, a collapsible tree view and errors reported with the exact line and column.',
    h1: 'JSON Formatter and Validator',
    intro:
      'Pretty-print JSON with the indentation you actually use, validate it as you type, and read it in a collapsible tree instead of a wall of text.',
    body: [
      'Formatting is the easy half. The useful half is what happens when the document is not valid: instead of a bare "invalid JSON", you get the exact line and column, the offending character marked inline in the editor, and a one-line hint at the cause — a trailing comma, a single-quoted string, an unquoted property name, an unclosed bracket.',
      'Indentation can be two spaces, four spaces or a tab, and keys can be sorted alphabetically at every level, which makes two versions of the same document diffable. The tree view adds type badges, item and key counts on collapsed nodes, a search box that filters to matching branches, and a copy-path action that yields paths like data.users[0].email.',
      'Large documents stay responsive: conversion is debounced and runs in a Web Worker, the tree only renders the rows in view, and above 5 MB automatic conversion pauses behind a button so a big paste never freezes the tab.',
    ],
    faq: [
      {
        q: 'Does this validate JSON as well as format it?',
        a: 'Yes. Every conversion is a real parse, so anything that formats successfully is valid JSON. When it fails you get the line, the column, an inline marker on the offending character and a hint at the likely cause.',
      },
      {
        q: 'Can I sort the keys alphabetically?',
        a: 'Yes — the Sort keys toggle orders object keys at every level of nesting. It is the quickest way to make two dumps of the same object comparable in a diff.',
      },
      {
        q: 'How large a document can it handle?',
        a: 'Parsing runs off the main thread and the tree view is virtualised, so multi-megabyte documents stay usable. Past 5 MB, automatic conversion pauses and a Convert button appears so you decide when the work happens.',
      },
    ],
  },
  {
    path: '/json-minify',
    label: 'Minify JSON',
    mode: 'minify',
    autoDetect: false,
    title: 'JSON Minifier — Compress JSON by Removing Whitespace',
    description:
      'Strip every byte of insignificant whitespace from JSON and see the size before and after. Useful for config values, environment variables and request bodies.',
    h1: 'JSON Minifier',
    intro:
      'Remove all insignificant whitespace from a JSON document and watch the byte count drop in the status bar.',
    body: [
      'Minified JSON is what you want anywhere the document has to travel as a single value: an environment variable, a database column, a header, a request body, a CI secret. This strips every space, tab and newline that is not inside a string, and leaves everything that is.',
      'The status bar shows the input and output size side by side, so you can see exactly what you saved. Because the output is a genuine re-serialisation of a parsed document rather than a regex over text, strings containing braces or newlines survive untouched.',
      'Pair it with the stringify page when you need a compact escaped literal: minify first, then stringify, and the result has no \\n sequences in it at all.',
    ],
    faq: [
      {
        q: 'Does minifying change the data?',
        a: 'No. The document is parsed and re-serialised, so only whitespace between tokens is removed. Values, key order and string contents are identical.',
      },
      {
        q: 'How much smaller does JSON get?',
        a: 'It depends on the original indentation and nesting depth. Pretty-printed documents with deep nesting commonly shrink by 30-50%; already-compact documents barely change.',
      },
    ],
  },
  {
    path: '/ndjson-to-json',
    label: 'NDJSON to JSON',
    mode: 'beautify',
    autoDetect: true,
    title: 'NDJSON to JSON Array Converter — JSON Lines Online',
    description:
      'Paste NDJSON or JSON Lines — one document per line — and get a single valid JSON array back, formatted and ready to read in a tree view.',
    h1: 'NDJSON to JSON Array',
    intro:
      'Convert newline-delimited JSON — one document per line, the format most log pipelines emit — into a single valid JSON array.',
    body: [
      'NDJSON, JSON Lines and JSONL all describe the same thing: a file where each line is its own complete JSON document, with no commas or enclosing brackets. It streams beautifully and parses terribly, because JSON.parse chokes on the second line.',
      'Paste it here and every non-blank line is parsed independently. If they all succeed, the documents are wrapped into one array, the count is reported, and the result is formatted and available in the tree view. If a line is malformed you get its line number rather than a blanket failure.',
      'Turn the "Wrap NDJSON" toggle off if you would rather be told what was detected and handle the lines yourself.',
    ],
    faq: [
      {
        q: 'What is the difference between NDJSON, JSON Lines and JSONL?',
        a: 'Nothing meaningful — they are three names for the same convention: one complete JSON document per line, separated by newlines, with no surrounding array or commas.',
      },
      {
        q: 'What happens if one line is broken?',
        a: 'The input is no longer treated as NDJSON and you get a normal parse error pointing at the problem, so you can see which line needs fixing rather than being told the whole file is invalid.',
      },
    ],
  },
  {
    path: '/json-repair',
    label: 'Repair JSON',
    mode: 'beautify',
    autoDetect: true,
    title: 'Fix Invalid JSON — Trailing Commas, Single Quotes, Keys',
    description:
      'Repair broken JSON online: trailing commas, single-quoted strings, unquoted keys, Python None/True/False, comments and NaN. Every fix is listed so nothing changes silently.',
    h1: 'Fix Invalid JSON',
    intro:
      'Repair the JSON that people actually paste — trailing commas, single quotes, unquoted keys, Python literals and comments — with every change listed so nothing happens behind your back.',
    body: [
      'Most "invalid JSON" is not broken data, it is a document written by a human or dumped by a language that is looser than the spec. Python prints None, True and False. JavaScript object literals leave keys unquoted and allow trailing commas. Config files pick up // comments. All of it parses fine in its home language and fails hard in a JSON parser.',
      'Turn on Lenient repair and a character-level scanner rewrites the input: trailing commas removed, single-quoted strings converted to double quotes with inner quotes escaped, bare keys and values quoted, None/True/False mapped to null/true/false, NaN, Infinity and undefined mapped to null, and // and /* */ comments stripped. Escape sequences already inside strings are left untouched.',
      'Every repair is reported by name above the output, so you can see exactly what was changed before you trust the result. If a parse fails and the repair pass would have fixed it, the error banner offers to turn the toggle on for you.',
    ],
    faq: [
      {
        q: 'Why is my JSON invalid because of a trailing comma?',
        a: 'The JSON specification does not permit a comma before a closing brace or bracket, even though JavaScript and most languages allow it in their own object and array literals. It is the single most common reason a hand-edited document fails to parse.',
      },
      {
        q: 'Can it fix single quotes around keys and values?',
        a: 'Yes. Single-quoted strings are converted to double-quoted ones, and any double quotes inside them are escaped so the result stays valid.',
      },
      {
        q: 'Does it change my data without telling me?',
        a: 'No. Repair is off by default, and when it is on every fix is listed above the output by name so you can review what changed.',
      },
    ],
  },
  {
    path: '/double-escaped-json',
    label: 'Double-escaped JSON',
    mode: 'unescape',
    autoDetect: true,
    title: 'Double-Escaped JSON Decoder — Fix \\\\" and \\\\\\\\n Payloads',
    description:
      'Decode JSON that was stringified twice or more. Recursive unescaping with up to five passes, stopping at the first pass that yields valid JSON, with the pass count shown.',
    h1: 'Decode Double-Escaped JSON',
    intro:
      'Payloads that were stringified twice come out as \\\\" and \\\\\\\\n instead of readable JSON. This decodes them all the way down and tells you how deep it went.',
    body: [
      'Double escaping happens when a document that was already a JSON string gets stringified again — an API that serialises a body that was itself serialised, a log framework that stringifies a field that was already a string, a queue message wrapped for transport. Each round doubles the backslashes, so \\" becomes \\\\" and a single \\n becomes \\\\n.',
      'A single JSON.parse only peels off one layer, which is why a naive decode still leaves you with backslashes. This tool parses, checks whether the result is an object or array, and if it is still a string, goes round again — up to five passes, stopping the moment it has real structure. The pass count is shown so you know how many layers were there.',
      'It also copes with the things that usually accompany a payload like this: a matching pair of outer quotes, a log timestamp and level in front of it, and unknown escape sequences that a stricter parser would reject outright.',
    ],
    faq: [
      {
        q: 'Why does my JSON have \\\\" instead of \\"?',
        a: 'It was stringified twice. The first pass turned " into \\", and the second pass escaped that backslash as well, producing \\\\". Each extra round of stringification doubles the backslashes again.',
      },
      {
        q: 'How many levels of escaping can it undo?',
        a: 'Up to five passes. It stops at the first pass that produces a valid object or array, so a singly escaped payload takes one pass and is not over-decoded.',
      },
      {
        q: 'Why not just call JSON.parse twice?',
        a: 'That works when you already know the exact depth. Real payloads vary, and often carry a log prefix or wrapping quotes that make a plain parse fail. This detects the depth for you and cleans up what surrounds the payload.',
      },
    ],
  },
];

export const DEFAULT_ROUTE = ROUTES[0];

/** Resolve a pathname to a route, tolerating trailing slashes and index.html. */
export function routeForPath(pathname: string): RouteDef {
  const normalised = pathname.replace(/index\.html$/, '').replace(/\/+$/, '') || '/';
  return ROUTES.find((route) => route.path === normalised) ?? DEFAULT_ROUTE;
}
