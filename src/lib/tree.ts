export type ValueType = 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null';

export interface TreeRow {
  /** Stable identity, also used as the expand/collapse key. */
  path: string;
  /** Human readable JSON path, e.g. data.users[0].email */
  label: string;
  key: string | null;
  value: unknown;
  type: ValueType;
  depth: number;
  childCount: number;
  hasChildren: boolean;
  expanded: boolean;
}

export function valueType(value: unknown): ValueType {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  switch (typeof value) {
    case 'object':
      return 'object';
    case 'number':
      return 'number';
    case 'boolean':
      return 'boolean';
    default:
      return 'string';
  }
}

export function childEntries(value: unknown): Array<[string, unknown]> {
  if (Array.isArray(value)) return value.map((item, index) => [String(index), item]);
  if (value && typeof value === 'object') return Object.entries(value as Record<string, unknown>);
  return [];
}

function joinPath(parent: string, key: string, parentIsArray: boolean): string {
  if (!parent) return parentIsArray ? `[${key}]` : key;
  return parentIsArray ? `${parent}[${key}]` : `${parent}.${key}`;
}

function matchesQuery(key: string | null, value: unknown, query: string): boolean {
  if (key && key.toLowerCase().includes(query)) return true;
  if (value === null) return 'null'.includes(query);
  if (typeof value !== 'object') return String(value).toLowerCase().includes(query);
  return false;
}

/** True when this node or anything below it matches the search query. */
function subtreeMatches(
  key: string | null,
  value: unknown,
  query: string,
  cache: Map<unknown, boolean>,
): boolean {
  if (matchesQuery(key, value, query)) return true;
  if (!value || typeof value !== 'object') return false;
  const cached = cache.get(value);
  if (cached !== undefined) return cached;
  cache.set(value, false);
  let found = false;
  for (const [childKey, childValue] of childEntries(value)) {
    if (subtreeMatches(childKey, childValue, query, cache)) {
      found = true;
      break;
    }
  }
  cache.set(value, found);
  return found;
}

export interface FlattenOptions {
  expanded: Set<string>;
  query?: string;
  /** Hard cap so a pathological document cannot lock the UI. */
  limit?: number;
}

/**
 * Produce the flat list of currently visible rows. Only visible rows are
 * generated, which keeps the tree cheap for very large documents.
 */
export function flattenTree(root: unknown, options: FlattenOptions): TreeRow[] {
  const { expanded, limit = 200000 } = options;
  const query = options.query?.trim().toLowerCase() ?? '';
  const cache = new Map<unknown, boolean>();
  const rows: TreeRow[] = [];

  const walk = (key: string | null, value: unknown, path: string, label: string, depth: number) => {
    if (rows.length >= limit) return;
    if (query && !subtreeMatches(key, value, query, cache)) return;

    const type = valueType(value);
    const entries = type === 'object' || type === 'array' ? childEntries(value) : [];
    const hasChildren = entries.length > 0;
    const isExpanded = hasChildren && (query ? true : expanded.has(path));

    rows.push({
      path,
      label,
      key,
      value,
      type,
      depth,
      childCount: entries.length,
      hasChildren,
      expanded: isExpanded,
    });

    if (!isExpanded) return;
    const isArray = type === 'array';
    for (const [childKey, childValue] of entries) {
      walk(
        childKey,
        childValue,
        `${path}/${childKey}`,
        joinPath(label, childKey, isArray),
        depth + 1,
      );
    }
  };

  walk(null, root, '$', '', 0);
  return rows;
}

/** Every container path in the document — used by "expand all". */
export function allContainerPaths(root: unknown, maxNodes = 50000): string[] {
  const paths: string[] = [];
  const stack: Array<{ value: unknown; path: string }> = [{ value: root, path: '$' }];
  while (stack.length && paths.length < maxNodes) {
    const node = stack.pop()!;
    if (!node.value || typeof node.value !== 'object') continue;
    paths.push(node.path);
    for (const [key, child] of childEntries(node.value)) {
      if (child && typeof child === 'object') stack.push({ value: child, path: `${node.path}/${key}` });
    }
  }
  return paths;
}

export function previewValue(value: unknown): string {
  switch (valueType(value)) {
    case 'string':
      return JSON.stringify(value);
    case 'null':
      return 'null';
    case 'object':
    case 'array':
      return '';
    default:
      return String(value);
  }
}
