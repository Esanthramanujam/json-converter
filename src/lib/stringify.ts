export interface StringifyOptions {
  wrapQuotes: boolean;
  escapeNonAscii: boolean;
}

const SIMPLE: Record<string, string> = {
  '"': '\\"',
  '\\': '\\\\',
  '\n': '\\n',
  '\r': '\\r',
  '\t': '\\t',
  '\b': '\\b',
  '\f': '\\f',
};

function hex4(code: number): string {
  return '\\u' + code.toString(16).padStart(4, '0');
}

/** Escape a raw string into a JSON string literal body (no surrounding quotes). */
export function escapeStringBody(input: string, escapeNonAscii = false): string {
  let out = '';
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    const simple = SIMPLE[ch];
    if (simple) {
      out += simple;
      continue;
    }
    const code = input.charCodeAt(i);
    if (code < 0x20) {
      out += hex4(code);
      continue;
    }
    if (escapeNonAscii && code > 0x7e) {
      out += hex4(code);
      continue;
    }
    out += ch;
  }
  return out;
}

export function stringifyText(input: string, options: StringifyOptions): string {
  const body = escapeStringBody(input, options.escapeNonAscii);
  return options.wrapQuotes ? `"${body}"` : body;
}
