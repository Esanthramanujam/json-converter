import { describe, expect, it } from 'vitest';
import { convert } from '../convert';
import { DEFAULT_OPTIONS } from '../types';
import type { ConvertOptions } from '../types';

const opts = (overrides: Partial<ConvertOptions> = {}): ConvertOptions => ({
  ...DEFAULT_OPTIONS,
  autoDetect: false,
  ...overrides,
});

describe('convert — empty input', () => {
  it('succeeds with empty output', () => {
    const result = convert('', opts());
    expect(result.ok).toBe(true);
    expect(result.output).toBe('');
    expect(result.error).toBeUndefined();
  });

  it('treats whitespace-only input as empty', () => {
    expect(convert('   \n\t ', opts()).ok).toBe(true);
  });
});

describe('convert — unescape mode', () => {
  it('unescapes a single-escaped payload', () => {
    const input = JSON.stringify(JSON.stringify({ name: 'test' }));
    const result = convert(input, opts({ mode: 'unescape' }));
    expect(result.ok).toBe(true);
    expect(result.passes).toBe(1);
    expect(JSON.parse(result.output)).toEqual({ name: 'test' });
  });

  it('unescapes a double-escaped payload and reports the pass count', () => {
    const input = String.raw`"{\\\"name\\\":\\\"test\\\"}"`;
    const result = convert(input, opts({ mode: 'unescape' }));
    expect(result.ok).toBe(true);
    expect(result.passes).toBe(2);
    expect(result.notes).toContain('Applied 2 unescape passes');
    expect(JSON.parse(result.output)).toEqual({ name: 'test' });
  });

  it('handles quote-wrapped input', () => {
    const result = convert('\'{"a":1}\'', opts({ mode: 'unescape' }));
    expect(result.ok).toBe(true);
    expect(JSON.parse(result.output)).toEqual({ a: 1 });
  });

  it('passes already-valid JSON through untouched', () => {
    const result = convert('{"a":[1,2,3]}', opts({ mode: 'unescape' }));
    expect(result.ok).toBe(true);
    expect(result.passes).toBe(0);
    expect(result.output).toBe('{\n  "a": [\n    1,\n    2,\n    3\n  ]\n}');
  });

  it('decodes unicode escapes', () => {
    const input = JSON.stringify(JSON.stringify({ city: 'München' }));
    const result = convert(input, opts({ mode: 'unescape' }));
    expect(JSON.parse(result.output)).toEqual({ city: 'München' });
  });
});

describe('convert — beautify and minify', () => {
  it('beautifies with the requested indentation', () => {
    const result = convert('{"a":1}', opts({ mode: 'beautify', indent: '4' }));
    expect(result.output).toBe('{\n    "a": 1\n}');
  });

  it('minifies', () => {
    const result = convert('{\n  "a": 1\n}', opts({ mode: 'minify' }));
    expect(result.output).toBe('{"a":1}');
  });

  it('sorts keys when asked', () => {
    const result = convert('{"b":1,"a":2}', opts({ mode: 'minify', sortKeys: true }));
    expect(result.output).toBe('{"a":2,"b":1}');
  });
});

describe('convert — stringify mode', () => {
  it('produces a quoted string literal', () => {
    const result = convert('{"a":1}', opts({ mode: 'stringify', indent: '2' }));
    expect(result.ok).toBe(true);
    expect(JSON.parse(result.output)).toBe('{\n  "a": 1\n}');
  });

  it('can omit the wrapping quotes', () => {
    const result = convert('{"a":1}', opts({ mode: 'stringify', wrapQuotes: false }));
    expect(result.output.startsWith('"')).toBe(false);
  });

  it('can escape non-ASCII characters', () => {
    const result = convert('{"a":"é"}', opts({ mode: 'stringify', escapeNonAscii: true }));
    expect(result.output).toContain('\\u00e9');
  });
});

describe('convert — errors and repair', () => {
  it('reports line and column for a syntax error', () => {
    const result = convert('{\n  "a": 1,\n}', opts({ mode: 'beautify' }));
    expect(result.ok).toBe(false);
    expect(result.error?.line).toBe(3);
    expect(result.error?.hint).toMatch(/trailing comma/i);
    expect(result.error?.repairable).toBe(true);
  });

  it('fixes trailing commas when repair is enabled', () => {
    const result = convert('{"a":1,"b":[1,2,],}', opts({ mode: 'beautify', repair: true }));
    expect(result.ok).toBe(true);
    expect(result.repairs).toContain('Removed a trailing comma');
    expect(JSON.parse(result.output)).toEqual({ a: 1, b: [1, 2] });
  });

  it('fixes single quotes and unquoted keys when repair is enabled', () => {
    const result = convert("{name:'ada', ok:True,}", opts({ mode: 'beautify', repair: true }));
    expect(result.ok).toBe(true);
    expect(JSON.parse(result.output)).toEqual({ name: 'ada', ok: true });
  });

  it('still fails cleanly when repair cannot help', () => {
    const result = convert('{"a": ', opts({ mode: 'beautify', repair: true }));
    expect(result.ok).toBe(false);
    expect(result.error?.message).toBeTruthy();
  });
});

describe('convert — NDJSON', () => {
  const ndjson = '{"a":1}\n{"a":2}\n{"a":3}';

  it('wraps JSON Lines into an array', () => {
    const result = convert(ndjson, opts({ mode: 'beautify', wrapNdjson: true }));
    expect(result.ok).toBe(true);
    expect(result.ndjson).toBe(true);
    expect(JSON.parse(result.output)).toEqual([{ a: 1 }, { a: 2 }, { a: 3 }]);
  });

  it('flags NDJSON without wrapping when the toggle is off', () => {
    const result = convert(ndjson, opts({ mode: 'beautify', wrapNdjson: false }));
    expect(result.ndjson).toBe(true);
    expect(result.ok).toBe(false);
  });
});

describe('convert — auto detect', () => {
  it('picks unescape for an escaped payload', () => {
    const input = JSON.stringify(JSON.stringify({ a: 1 }));
    expect(convert(input, opts({ autoDetect: true, mode: 'minify' })).mode).toBe('unescape');
  });

  it('picks beautify for plain JSON', () => {
    expect(convert('{"a":1}', opts({ autoDetect: true, mode: 'stringify' })).mode).toBe('beautify');
  });
});

describe('convert — very deep documents', () => {
  const build = (levels: number) => {
    let value: unknown = { leaf: 'bottom' };
    for (let i = 0; i < levels; i++) value = { [`level${i}`]: value };
    return value;
  };

  it('beautifies a 150-level document', () => {
    const result = convert(JSON.stringify(build(150)), opts({ mode: 'beautify' }));
    expect(result.ok).toBe(true);
    expect(result.stats.depth).toBe(151);
  });

  it('unescapes a 120-level escaped document', () => {
    const input = JSON.stringify(JSON.stringify(build(120)));
    const result = convert(input, opts({ mode: 'unescape' }));
    expect(result.ok).toBe(true);
    expect(result.stats.depth).toBe(121);
    expect(result.passes).toBe(1);
  });
});
