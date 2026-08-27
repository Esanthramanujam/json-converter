import { stripLogPrefix, tryParse } from './detect';

export const MAX_UNESCAPE_PASSES = 5;

export interface UnescapeResult {
  /** Best-effort JSON text after unescaping. */
  text: string;
  /** How many unescape passes were applied. */
  passes: number;
  /** Parsed value, present when `parsed` is true. */
  value?: unknown;
  parsed: boolean;
  notes: string[];
}

/** Remove one matching pair of wrapping quotes, if present. */
export function stripWrappingQuotes(text: string): { text: string; changed: boolean } {
  const t = text.trim();
  if (t.length < 2) return { text: t, changed: false };
  const first = t[0];
  const last = t[t.length - 1];
  if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
    return { text: t.slice(1, -1), changed: true };
  }
  return { text: t, changed: false };
}

/**
 * Decode backslash escape sequences the way a JSON string literal would be decoded.
 * Unknown escapes (`\q`) collapse to the escaped character, which is what messy
 * real-world payloads normally intend.
 */
export function decodeEscapes(text: string): string {
  let out = '';
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch !== '\\') {
      out += ch;
      continue;
    }
    const next = text[i + 1];
    if (next === undefined) {
      out += ch;
      continue;
    }
    switch (next) {
      case '"':
        out += '"';
        i++;
        break;
      case "'":
        out += "'";
        i++;
        break;
      case '\\':
        out += '\\';
        i++;
        break;
      case '/':
        out += '/';
        i++;
        break;
      case 'n':
        out += '\n';
        i++;
        break;
      case 'r':
        out += '\r';
        i++;
        break;
      case 't':
        out += '\t';
        i++;
        break;
      case 'b':
        out += '\b';
        i++;
        break;
      case 'f':
        out += '\f';
        i++;
        break;
      case 'u': {
        const hex = text.slice(i + 2, i + 6);
        if (/^[0-9a-fA-F]{4}$/.test(hex)) {
          out += String.fromCharCode(parseInt(hex, 16));
          i += 5;
        } else {
          out += next;
          i++;
        }
        break;
      }
      default:
        out += next;
        i++;
        break;
    }
  }
  return out;
}

function isContainer(value: unknown): boolean {
  return typeof value === 'object' && value !== null;
}

/**
 * Recursively unescape a (possibly multiply) stringified JSON document.
 * Stops at the first pass that yields a valid object or array, or after
 * MAX_UNESCAPE_PASSES passes.
 */
export function unescapeToJson(input: string): UnescapeResult {
  const notes: string[] = [];
  let text = input.trim();

  const stripped = stripLogPrefix(text);
  if (stripped !== text) {
    notes.push('Removed log prefix before the JSON payload');
    text = stripped;
  }

  let passes = 0;

  for (let i = 0; i < MAX_UNESCAPE_PASSES; i++) {
    const direct = tryParse(text);
    if (direct.ok) {
      if (isContainer(direct.value)) {
        return { text, passes, value: direct.value, parsed: true, notes };
      }
      if (typeof direct.value === 'string') {
        text = direct.value;
        passes++;
        continue;
      }
      // A bare scalar is still valid JSON - nothing left to unescape.
      return { text, passes, value: direct.value, parsed: true, notes };
    }

    const unquoted = stripWrappingQuotes(text);
    if (unquoted.changed && passes === 0) {
      notes.push('Stripped wrapping quotes');
    }
    const decoded = decodeEscapes(unquoted.text).trim();
    if (decoded === text) break;
    text = decoded;
    passes++;
  }

  const final = tryParse(text);
  if (final.ok) {
    return { text, passes, value: final.value, parsed: true, notes };
  }
  return { text, passes, parsed: false, notes };
}
