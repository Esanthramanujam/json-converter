import { describe, expect, it } from 'vitest';
import { allContainerPaths, flattenTree, valueType } from '../tree';

const doc = {
  data: {
    users: [
      { email: 'ada@example.com', active: true },
      { email: 'bob@example.com', active: false },
    ],
  },
  count: 2,
};

describe('valueType', () => {
  it('classifies every JSON type', () => {
    expect(valueType(null)).toBe('null');
    expect(valueType([])).toBe('array');
    expect(valueType({})).toBe('object');
    expect(valueType(1)).toBe('number');
    expect(valueType(true)).toBe('boolean');
    expect(valueType('x')).toBe('string');
  });
});

describe('flattenTree', () => {
  it('only emits visible rows', () => {
    const rows = flattenTree(doc, { expanded: new Set(['$']) });
    expect(rows.map((r) => r.key)).toEqual([null, 'data', 'count']);
  });

  it('builds readable JSON paths', () => {
    const expanded = new Set(['$', '$/data', '$/data/users', '$/data/users/0']);
    const rows = flattenTree(doc, { expanded });
    const emails = rows.filter((r) => r.key === 'email');
    expect(emails[0].label).toBe('data.users[0].email');
  });

  it('filters to matching branches', () => {
    const rows = flattenTree(doc, { expanded: new Set(), query: 'bob' });
    expect(rows.some((r) => r.label === 'data.users[1].email')).toBe(true);
    expect(rows.some((r) => r.label === 'data.users[0].email')).toBe(false);
  });
});

describe('allContainerPaths', () => {
  it('lists every container', () => {
    expect(allContainerPaths(doc).sort()).toEqual(
      ['$', '$/data', '$/data/users', '$/data/users/0', '$/data/users/1'].sort(),
    );
  });
});
