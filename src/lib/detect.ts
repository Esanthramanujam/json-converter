import type { Mode } from './types';

/** Cheap "does this parse" helper that never throws. */
export function tryParse(text: string): { ok: true; value: unknown } | { ok: false; error: Error } {
  try {
    return { ok: true, value: JSON.parse(text) as unknown };
  } catch (error) {
    return { ok: false, error: error as Error };
  }
}

/**
 * Remove log noise in front of a JSON payload:
 *   2024-01-02T03:04:05Z INFO  response: {"a":1}
 * Only strips when the prefix contains no JSON-ish punctuation of its own.
 */
export function stripLogPrefix(text: string): string {
  const trimmed = text.trimStart();
  if (/^["'{[]/.test(trimmed)) return trimmed;
  const idx = trimmed.search(/["'{[]/);
  if (idx <= 0) return trimmed;
  const prefix = trimmed.slice(0, idx);
  if (prefix.length > 500) return trimmed;
  // A prefix that already contains quotes or closing brackets is probably real content.
  if (/["'}\]]/.test(prefix)) return trimmed;
  return trimmed.slice(idx);
}

/** Does the raw text look like a JSON document that was itself run through JSON.stringify? */
export function looksLikeEscapedString(text: string): boolean {
  const t = text.trim();
  if (t.length < 2) return false;
  const wrapped =
    (t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"));
  if (wrapped) return true;
  return /\\["\\/bfnrtu]/.test(t) && /[{[]/.test(t);
}

/**
 * Split NDJSON / JSON Lines input into its individual documents.
 * Returns null when the input is not multi-document.
 */
export function splitNdjson(text: string): string[] | null {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (lines.length < 2) return null;
  if (!lines.every((l) => /^[{[]/.test(l))) return null;
  if (!lines.every((l) => tryParse(l).ok)) return null;
  return lines;
}

/**
 * Pick the mode that best fits the input.
 *  - already-valid object/array JSON  -> beautify
 *  - quote wrapped or escape-heavy    -> unescape
 */
export function detectMode(text: string): Mode {
  const t = text.trim();
  if (!t) return 'unescape';

  if (/^[{[]/.test(t)) {
    const parsed = tryParse(t);
    if (parsed.ok) return 'beautify';
  }

  if (splitNdjson(t)) return 'beautify';

  if (looksLikeEscapedString(t)) return 'unescape';

  const parsed = tryParse(t);
  if (parsed.ok) {
    return typeof parsed.value === 'string' ? 'unescape' : 'beautify';
  }

  if (stripLogPrefix(t) !== t) return 'unescape';
  return t.includes('\\') ? 'unescape' : 'beautify';
}
