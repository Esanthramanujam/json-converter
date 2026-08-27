import { describe, expect, it } from 'vitest';
import { decodeEscapes, stripWrappingQuotes, unescapeToJson } from '../unescape';

/**
 * Naming convention used below: "single-escaped" means the JSON document was
 * put through JSON.stringify once *after* being serialised, which costs one
 * unescape pass to undo.
 */
const escape = (value: unknown, times: number) => {
  let text = JSON.stringify(value);
  for (let i = 0; i < times; i++) text = JSON.stringify(text);
  return text;
};

describe('stripWrappingQuotes', () => {
  it('removes a matching double-quote pair', () => {
    expect(stripWrappingQuotes('"hello"')).toEqual({ text: 'hello', changed: true });
  });

  it('removes a matching single-quote pair', () => {
    expect(stripWrappingQuotes("'hello'")).toEqual({ text: 'hello', changed: true });
  });

  it('leaves mismatched quotes alone', () => {
    expect(stripWrappingQuotes('"hello\'')).toEqual({ text: '"hello\'', changed: false });
  });
});

describe('decodeEscapes', () => {
  it('handles every JSON escape sequence', () => {
    expect(decodeEscapes('a\\"b\\\\c\\/d\\ne\\rf\\tg\\bh\\fi')).toBe('a"b\\c/d\ne\rf\tg\bh\fi');
  });

  it('decodes \\uXXXX sequences', () => {
    expect(decodeEscapes('caf\\u00e9 \\u2014 \\u00fc')).toBe('café — ü');
  });

  it('leaves malformed unicode escapes readable', () => {
    expect(decodeEscapes('\\uZZZZ')).toBe('uZZZZ');
  });
});

describe('unescapeToJson', () => {
  it('unwraps a single-escaped document in one pass', () => {
    const result = unescapeToJson(escape({ name: 'test', n: 1 }, 1));
    expect(result.parsed).toBe(true);
    expect(result.passes).toBe(1);
    expect(result.value).toEqual({ name: 'test', n: 1 });
  });

  it('unwraps a double-escaped document in two passes', () => {
    const result = unescapeToJson(escape({ deep: [1, 2, 3] }, 2));
    expect(result.parsed).toBe(true);
    expect(result.passes).toBe(2);
    expect(result.value).toEqual({ deep: [1, 2, 3] });
  });

  it('unwraps a triple-escaped document in three passes', () => {
    const result = unescapeToJson(escape({ a: { b: 'c' } }, 3));
    expect(result.parsed).toBe(true);
    expect(result.passes).toBe(3);
    expect(result.value).toEqual({ a: { b: 'c' } });
  });

  it('handles a hand-written double-escaped literal', () => {
    const input = String.raw`"{\\\"name\\\":\\\"test\\\"}"`;
    const result = unescapeToJson(input);
    expect(result.parsed).toBe(true);
    expect(result.passes).toBe(2);
    expect(result.value).toEqual({ name: 'test' });
  });

  it('stops after at most five passes', () => {
    const result = unescapeToJson(escape({ a: 1 }, 9));
    expect(result.passes).toBeLessThanOrEqual(5);
  });

  it('handles quote-wrapped input that is not itself valid JSON', () => {
    const result = unescapeToJson('\'{"a":1}\'');
    expect(result.parsed).toBe(true);
    expect(result.value).toEqual({ a: 1 });
    expect(result.notes).toContain('Stripped wrapping quotes');
  });

  it('passes already-valid JSON straight through', () => {
    const result = unescapeToJson('{"a":[1,2,3]}');
    expect(result.parsed).toBe(true);
    expect(result.passes).toBe(0);
    expect(result.value).toEqual({ a: [1, 2, 3] });
  });

  it('strips a log prefix before the payload', () => {
    const result = unescapeToJson('2026-01-14T09:30:02Z INFO response: {"ok":true}');
    expect(result.parsed).toBe(true);
    expect(result.value).toEqual({ ok: true });
    expect(result.notes).toContain('Removed log prefix before the JSON payload');
  });

  it('decodes unicode escapes inside an escaped payload', () => {
    const result = unescapeToJson(escape({ city: 'München', dash: '—' }, 1));
    expect(result.value).toEqual({ city: 'München', dash: '—' });
  });

  it('handles a 120-level nested document', () => {
    let deep: unknown = { leaf: true };
    for (let i = 0; i < 120; i++) deep = { [`level${i}`]: deep };
    const result = unescapeToJson(escape(deep, 1));
    expect(result.parsed).toBe(true);
    expect(result.value).toEqual(deep);
  });

  it('reports failure for input that cannot be recovered', () => {
    const result = unescapeToJson('{not json at all');
    expect(result.parsed).toBe(false);
  });
});
