import { describe, expect, it } from 'vitest';
import { repairJson } from '../repair';

function repaired(input: string) {
  const result = repairJson(input);
  return { value: JSON.parse(result.text) as unknown, fixes: result.fixes };
}

describe('repairJson', () => {
  it('removes trailing commas in objects and arrays', () => {
    const { value, fixes } = repaired('{"a":1,"b":[1,2,3,],}');
    expect(value).toEqual({ a: 1, b: [1, 2, 3] });
    expect(fixes).toContain('Removed a trailing comma');
  });

  it('converts single-quoted keys and values', () => {
    const { value, fixes } = repaired("{'name':'ada','ok':true}");
    expect(value).toEqual({ name: 'ada', ok: true });
    expect(fixes).toContain('Converted single-quoted strings to double quotes');
  });

  it('quotes unquoted keys', () => {
    const { value, fixes } = repaired('{name:"ada",age:36}');
    expect(value).toEqual({ name: 'ada', age: 36 });
    expect(fixes).toContain('Added quotes around unquoted keys');
  });

  it('quotes unquoted values', () => {
    const { value, fixes } = repaired('{"status":active}');
    expect(value).toEqual({ status: 'active' });
    expect(fixes).toContain('Added quotes around unquoted values');
  });

  it('translates Python literals', () => {
    const { value, fixes } = repaired('{"a":None,"b":True,"c":False}');
    expect(value).toEqual({ a: null, b: true, c: false });
    expect(fixes).toContain('Replaced Python None with null');
    expect(fixes).toContain('Replaced Python True with true');
    expect(fixes).toContain('Replaced Python False with false');
  });

  it('replaces non-finite numbers with null', () => {
    const { value } = repaired('{"a":NaN,"b":Infinity,"c":undefined}');
    expect(value).toEqual({ a: null, b: null, c: null });
  });

  it('strips line and block comments', () => {
    const { value, fixes } = repaired('{\n  // a comment\n  "a": 1, /* inline */ "b": 2\n}');
    expect(value).toEqual({ a: 1, b: 2 });
    expect(fixes).toContain('Removed a // comment');
    expect(fixes).toContain('Removed a /* */ comment');
  });

  it('keeps escaped characters inside strings intact', () => {
    const { value } = repaired('{"text":"line\\nbreak \\u00e9 \\"quoted\\"",}');
    expect(value).toEqual({ text: 'line\nbreak é "quoted"' });
  });

  it('preserves apostrophes inside double-quoted strings', () => {
    const { value } = repaired('{"text":"it\'s fine",}');
    expect(value).toEqual({ text: "it's fine" });
  });

  it('escapes raw newlines found inside single-quoted strings', () => {
    const { value } = repaired("{'text':'two\nlines'}");
    expect(value).toEqual({ text: 'two\nlines' });
  });

  it('reports no fixes for already-valid JSON', () => {
    const result = repairJson('{"a":1,"b":[true,null,"x"]}');
    expect(result.fixes).toEqual([]);
    expect(JSON.parse(result.text)).toEqual({ a: 1, b: [true, null, 'x'] });
  });
});
