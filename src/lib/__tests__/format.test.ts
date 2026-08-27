import { describe, expect, it } from 'vitest';
import { computeStats, formatBytes, formatJson, measureValue, minifyJson, sortKeysDeep } from '../format';

describe('sortKeysDeep', () => {
  it('sorts nested object keys alphabetically', () => {
    const sorted = sortKeysDeep({ b: 1, a: { d: 2, c: 3 }, list: [{ z: 1, y: 2 }] });
    expect(JSON.stringify(sorted)).toBe('{"a":{"c":3,"d":2},"b":1,"list":[{"y":2,"z":1}]}');
  });
});

describe('formatJson / minifyJson', () => {
  const value = { a: 1, b: [1, 2] };

  it('indents with two spaces', () => {
    expect(formatJson(value, '2', false)).toBe('{\n  "a": 1,\n  "b": [\n    1,\n    2\n  ]\n}');
  });

  it('indents with tabs', () => {
    expect(formatJson(value, 'tab', false).split('\n')[1].startsWith('\t')).toBe(true);
  });

  it('minifies', () => {
    expect(minifyJson(value, false)).toBe('{"a":1,"b":[1,2]}');
  });
});

describe('measureValue', () => {
  it('measures depth and key count', () => {
    expect(measureValue({ a: { b: { c: 1 } } })).toEqual({ depth: 3, keys: 3 });
  });

  it('handles deeply nested documents without recursion limits', () => {
    let deep: unknown = { leaf: true };
    for (let i = 0; i < 500; i++) deep = { nested: deep };
    expect(measureValue(deep).depth).toBe(501);
  });
});

describe('computeStats', () => {
  it('counts characters, lines and bytes', () => {
    const stats = computeStats('{\n  "a": "é"\n}', { a: 'é' });
    expect(stats.chars).toBe(14);
    expect(stats.lines).toBe(3);
    expect(stats.bytes).toBe(15);
    expect(stats.keys).toBe(1);
  });
});

describe('formatBytes', () => {
  it('scales units', () => {
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(2048)).toBe('2.0 KB');
    expect(formatBytes(5 * 1024 * 1024)).toBe('5.00 MB');
  });
});
