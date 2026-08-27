import { describe, expect, it } from 'vitest';
import { detectMode, looksLikeEscapedString, splitNdjson, stripLogPrefix } from '../detect';

describe('detectMode', () => {
  it('chooses beautify for valid JSON documents', () => {
    expect(detectMode('{"a":1}')).toBe('beautify');
    expect(detectMode('[1,2,3]')).toBe('beautify');
  });

  it('chooses beautify for valid JSON that merely contains escape sequences', () => {
    expect(detectMode('{"text":"line\\nbreak"}')).toBe('beautify');
  });

  it('chooses unescape for quote-wrapped input', () => {
    expect(detectMode('"{\\"a\\":1}"')).toBe('unescape');
    expect(detectMode("'{\"a\":1}'")).toBe('unescape');
  });

  it('chooses unescape for escape-heavy input', () => {
    expect(detectMode('{\\"a\\":1}')).toBe('unescape');
  });

  it('chooses unescape for log-prefixed payloads', () => {
    expect(detectMode('2026-01-14 INFO payload = {\\"a\\":1}')).toBe('unescape');
  });

  it('chooses beautify for NDJSON', () => {
    expect(detectMode('{"a":1}\n{"a":2}')).toBe('beautify');
  });
});

describe('looksLikeEscapedString', () => {
  it('is true for wrapped and escaped input', () => {
    expect(looksLikeEscapedString('"{\\"a\\":1}"')).toBe(true);
    expect(looksLikeEscapedString('{\\"a\\":1}')).toBe(true);
  });

  it('is false for plain JSON', () => {
    expect(looksLikeEscapedString('{"a":1}')).toBe(false);
  });
});

describe('stripLogPrefix', () => {
  it('removes timestamps, levels and labels', () => {
    expect(stripLogPrefix('2026-01-14T09:30:02Z INFO response: {"a":1}')).toBe('{"a":1}');
    expect(stripLogPrefix('payload = [1,2]')).toBe('[1,2]');
  });

  it('leaves clean input untouched', () => {
    expect(stripLogPrefix('  {"a":1}')).toBe('{"a":1}');
  });
});

describe('splitNdjson', () => {
  it('splits multiple documents', () => {
    expect(splitNdjson('{"a":1}\n{"a":2}\n{"a":3}')).toHaveLength(3);
  });

  it('returns null for a single document', () => {
    expect(splitNdjson('{"a":1}')).toBeNull();
  });

  it('returns null when a line is not valid JSON', () => {
    expect(splitNdjson('{"a":1}\nnot json')).toBeNull();
  });
});
