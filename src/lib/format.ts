import type { IndentOption, JsonStats } from './types';

export function indentValue(option: IndentOption): string | number {
  if (option === 'tab') return '\t';
  return option === '4' ? 4 : 2;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Deep, stable, alphabetical key ordering. */
export function sortKeysDeep<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => sortKeysDeep(item)) as unknown as T;
  }
  if (isPlainObject(value)) {
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(value).sort((a, b) => a.localeCompare(b))) {
      sorted[key] = sortKeysDeep(value[key]);
    }
    return sorted as unknown as T;
  }
  return value;
}

export function formatJson(value: unknown, indent: IndentOption, sortKeys: boolean): string {
  const prepared = sortKeys ? sortKeysDeep(value) : value;
  return JSON.stringify(prepared, null, indentValue(indent)) ?? '';
}

export function minifyJson(value: unknown, sortKeys: boolean): string {
  const prepared = sortKeys ? sortKeysDeep(value) : value;
  return JSON.stringify(prepared) ?? '';
}

/** Iterative depth/key walk so that huge documents cannot blow the stack. */
export function measureValue(value: unknown): { depth: number; keys: number } {
  let depth = 0;
  let keys = 0;
  const stack: Array<{ value: unknown; level: number }> = [{ value, level: 1 }];
  while (stack.length) {
    const node = stack.pop()!;
    if (node.value === null || typeof node.value !== 'object') continue;
    if (node.level > depth) depth = node.level;
    if (Array.isArray(node.value)) {
      for (const item of node.value) stack.push({ value: item, level: node.level + 1 });
    } else {
      for (const [, item] of Object.entries(node.value as Record<string, unknown>)) {
        keys++;
        stack.push({ value: item, level: node.level + 1 });
      }
    }
  }
  return { depth, keys };
}

export function byteLength(text: string): number {
  if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(text).length;
  return text.length;
}

export function computeStats(text: string, value?: unknown): JsonStats {
  const measured = value === undefined ? { depth: 0, keys: 0 } : measureValue(value);
  return {
    chars: text.length,
    lines: text.length === 0 ? 0 : text.split('\n').length,
    bytes: byteLength(text),
    depth: measured.depth,
    keys: measured.keys,
  };
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
