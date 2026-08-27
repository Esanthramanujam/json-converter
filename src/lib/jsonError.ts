import type { ConvertError } from './types';

export function positionToLineCol(text: string, position: number): { line: number; column: number } {
  const clamped = Math.max(0, Math.min(position, text.length));
  let line = 1;
  let lastBreak = -1;
  for (let i = 0; i < clamped; i++) {
    if (text[i] === '\n') {
      line++;
      lastBreak = i;
    }
  }
  return { line, column: clamped - lastBreak };
}

export function lineColToPosition(text: string, line: number, column: number): number {
  const lines = text.split('\n');
  let position = 0;
  for (let i = 0; i < Math.min(line - 1, lines.length); i++) {
    position += lines[i].length + 1;
  }
  return position + Math.max(0, column - 1);
}

/** Pull a character offset out of the engine's error message (V8, SpiderMonkey and JSC differ). */
function extractPosition(text: string, message: string): number | undefined {
  const byPosition = /position (\d+)/i.exec(message);
  if (byPosition) return Number(byPosition[1]);
  const byLineCol = /line (\d+) column (\d+)/i.exec(message);
  if (byLineCol) return lineColToPosition(text, Number(byLineCol[1]), Number(byLineCol[2]));
  return undefined;
}

function previousMeaningfulChar(text: string, index: number): string {
  for (let i = index - 1; i >= 0; i--) {
    if (!/\s/.test(text[i])) return text[i];
  }
  return '';
}

/** A short, specific guess at what the author actually did wrong. */
export function hintForError(text: string, message: string, position?: number): string | undefined {
  const lower = message.toLowerCase();

  if (lower.includes('unexpected end') || lower.includes('end of json input')) {
    return 'Unexpected end of input — a bracket, brace or quote is left unclosed.';
  }

  if (position !== undefined) {
    const ch = text[position];
    const prev = previousMeaningfulChar(text, position);

    if ((ch === '}' || ch === ']') && prev === ',') {
      return 'Trailing comma before a closing bracket — JSON does not allow one.';
    }
    if (ch === "'") {
      return 'Single quotes are not valid JSON — strings must use double quotes.';
    }
    if (ch && /[A-Za-z_$]/.test(ch)) {
      if (prev === '{' || prev === ',') {
        return 'Property names must be wrapped in double quotes.';
      }
      if (/^(None|True|False|NaN|Infinity|undefined)/.test(text.slice(position))) {
        return 'Python/JavaScript literals are not valid JSON — use null, true or false.';
      }
      return 'Unquoted value — strings must be wrapped in double quotes.';
    }
    if (ch === ',' && (prev === ',' || prev === '[' || prev === '{')) {
      return 'Empty slot — there is an extra comma here.';
    }
  }

  if (lower.includes('property name')) {
    return 'Property names must be wrapped in double quotes.';
  }
  if (lower.includes('double-quoted') || lower.includes("expected ',' or")) {
    return 'A comma or closing bracket is missing between two values.';
  }
  return undefined;
}

export function describeParseError(text: string, error: Error, repairable: boolean): ConvertError {
  const raw = error.message.replace(/^JSON\.parse:\s*/, '');
  const position = extractPosition(text, raw);
  const location = position === undefined ? undefined : positionToLineCol(text, position);
  const base = raw.replace(/\s*(in JSON )?at position \d+.*$/i, '').trim() || 'Invalid JSON';
  const message = location
    ? `${base} at line ${location.line}, column ${location.column}`
    : base;

  return {
    message,
    position,
    line: location?.line,
    column: location?.column,
    hint: hintForError(text, raw, position),
    repairable,
  };
}
