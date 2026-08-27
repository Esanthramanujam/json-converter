import { describe, expect, it } from 'vitest';
import { escapeStringBody, stringifyText } from '../stringify';

describe('escapeStringBody', () => {
  it('escapes quotes, backslashes and control characters', () => {
    expect(escapeStringBody('a"b\\c\nd\te')).toBe('a\\"b\\\\c\\nd\\te');
  });

  it('escapes other control characters as \\uXXXX', () => {
    expect(escapeStringBody('\u0001')).toBe('\\u0001');
  });

  it('leaves non-ASCII alone by default', () => {
    expect(escapeStringBody('café — ü')).toBe('café — ü');
  });

  it('escapes non-ASCII on request', () => {
    expect(escapeStringBody('é', true)).toBe('\\u00e9');
  });

  it('round-trips through JSON.parse', () => {
    const original = '{"a":"x\ny","b":"—"}';
    expect(JSON.parse(`"${escapeStringBody(original)}"`)).toBe(original);
  });
});

describe('stringifyText', () => {
  it('wraps in double quotes by default', () => {
    expect(stringifyText('{"a":1}', { wrapQuotes: true, escapeNonAscii: false })).toBe(
      '"{\\"a\\":1}"',
    );
  });

  it('omits the wrapping quotes on request', () => {
    expect(stringifyText('{"a":1}', { wrapQuotes: false, escapeNonAscii: false })).toBe(
      '{\\"a\\":1}',
    );
  });
});
