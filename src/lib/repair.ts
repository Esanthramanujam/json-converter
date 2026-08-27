export interface RepairResult {
  text: string;
  /** Human readable, de-duplicated list of the fixes that were applied. */
  fixes: string[];
}

interface StringRead {
  text: string;
  next: number;
  converted: boolean;
}

/**
 * Read a single- or double-quoted string starting at `start` and re-emit it as a
 * valid JSON double-quoted string.
 */
function readString(src: string, start: number): StringRead {
  const quote = src[start];
  let i = start + 1;
  let value = '';
  while (i < src.length) {
    const ch = src[i];
    if (ch === '\\') {
      const next = src[i + 1];
      if (next === undefined) {
        i++;
        break;
      }
      if (next === "'") {
        // \' is not legal JSON - the apostrophe does not need escaping.
        value += "'";
        i += 2;
        continue;
      }
      if (next === 'u') {
        value += '\\u' + src.slice(i + 2, i + 6);
        i += 6;
        continue;
      }
      if ('"\\/bfnrt'.includes(next)) {
        value += '\\' + next;
        i += 2;
        continue;
      }
      // Unknown escape - drop the backslash.
      value += next;
      i += 2;
      continue;
    }
    if (ch === quote) {
      i++;
      break;
    }
    if (ch === '"') {
      value += '\\"';
      i++;
      continue;
    }
    if (ch === '\n') {
      value += '\\n';
      i++;
      continue;
    }
    if (ch === '\r') {
      value += '\\r';
      i++;
      continue;
    }
    if (ch === '\t') {
      value += '\\t';
      i++;
      continue;
    }
    value += ch;
    i++;
  }
  return { text: '"' + value + '"', next: i, converted: quote === "'" };
}

function dropTrailingComma(out: string): { text: string; removed: boolean } {
  let j = out.length - 1;
  while (j >= 0 && /\s/.test(out[j])) j--;
  if (j >= 0 && out[j] === ',') {
    return { text: out.slice(0, j) + out.slice(j + 1), removed: true };
  }
  return { text: out, removed: false };
}

const PY_LITERALS: Record<string, string> = {
  None: 'null',
  True: 'true',
  False: 'false',
};

const NON_FINITE = new Set(['NaN', 'Infinity', '-Infinity', 'undefined']);

/**
 * Lenient repair pass. Fixes the mistakes that show up in hand-edited or
 * language-dumped JSON: trailing commas, single quotes, unquoted keys and
 * values, Python literals, comments and non-finite numbers.
 */
export function repairJson(input: string): RepairResult {
  const fixes = new Set<string>();
  const stack: Array<'object' | 'array'> = [];
  let out = '';
  let expectKey = false;
  let i = 0;

  while (i < input.length) {
    const ch = input[i];

    if (ch === '/' && input[i + 1] === '/') {
      while (i < input.length && input[i] !== '\n') i++;
      fixes.add('Removed a // comment');
      continue;
    }
    if (ch === '/' && input[i + 1] === '*') {
      i += 2;
      while (i < input.length && !(input[i] === '*' && input[i + 1] === '/')) i++;
      i += 2;
      fixes.add('Removed a /* */ comment');
      continue;
    }

    if (ch === '"' || ch === "'") {
      const read = readString(input, i);
      if (read.converted) fixes.add('Converted single-quoted strings to double quotes');
      out += read.text;
      i = read.next;
      expectKey = false;
      continue;
    }

    if (ch === '{') {
      stack.push('object');
      expectKey = true;
      out += ch;
      i++;
      continue;
    }
    if (ch === '[') {
      stack.push('array');
      expectKey = false;
      out += ch;
      i++;
      continue;
    }
    if (ch === '}' || ch === ']') {
      const dropped = dropTrailingComma(out);
      if (dropped.removed) fixes.add('Removed a trailing comma');
      out = dropped.text + ch;
      stack.pop();
      expectKey = false;
      i++;
      continue;
    }
    if (ch === ',') {
      out += ch;
      i++;
      expectKey = stack[stack.length - 1] === 'object';
      continue;
    }
    if (ch === ':') {
      out += ch;
      i++;
      expectKey = false;
      continue;
    }
    if (/\s/.test(ch)) {
      out += ch;
      i++;
      continue;
    }

    const match = /^[A-Za-z0-9_$+.\-]+/.exec(input.slice(i));
    if (match) {
      const token = match[0];
      i += token.length;

      if (expectKey) {
        out += JSON.stringify(token);
        fixes.add('Added quotes around unquoted keys');
        expectKey = false;
        continue;
      }
      if (token in PY_LITERALS) {
        out += PY_LITERALS[token];
        fixes.add(`Replaced Python ${token} with ${PY_LITERALS[token]}`);
        continue;
      }
      if (NON_FINITE.has(token)) {
        out += 'null';
        fixes.add(`Replaced ${token} with null`);
        continue;
      }
      if (token === 'true' || token === 'false' || token === 'null') {
        out += token;
        continue;
      }
      if (/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(token)) {
        out += token;
        continue;
      }
      out += JSON.stringify(token);
      fixes.add('Added quotes around unquoted values');
      continue;
    }

    out += ch;
    i++;
  }

  const tail = dropTrailingComma(out);
  if (tail.removed) {
    fixes.add('Removed a trailing comma');
    out = tail.text;
  }

  return { text: out, fixes: [...fixes] };
}
