import { describe, expect, it } from 'vitest';
import { DEFAULT_ROUTE, ROUTES, hrefFor, routeForPath } from '../routes';

describe('ROUTES', () => {
  it('has a unique path, title and description per route', () => {
    for (const key of ['path', 'title', 'description'] as const) {
      const values = ROUTES.map((route) => route[key]);
      expect(new Set(values).size).toBe(values.length);
    }
  });

  it('keeps titles short enough to survive a search result', () => {
    for (const route of ROUTES) expect(route.title.length).toBeLessThanOrEqual(62);
  });

  it('keeps descriptions inside the length Google renders', () => {
    for (const route of ROUTES) {
      expect(route.description.length).toBeGreaterThanOrEqual(110);
      expect(route.description.length).toBeLessThanOrEqual(175);
    }
  });

  it('gives every route at least two FAQ entries', () => {
    for (const route of ROUTES) expect(route.faq.length).toBeGreaterThanOrEqual(2);
  });
});

describe('routeForPath', () => {
  it('resolves the landing page', () => {
    expect(routeForPath('/').path).toBe('/');
  });

  it('resolves tool pages with and without a trailing slash', () => {
    expect(routeForPath('/json-stringify').mode).toBe('stringify');
    expect(routeForPath('/json-stringify/').mode).toBe('stringify');
    expect(routeForPath('/json-minify/index.html').mode).toBe('minify');
  });

  it('strips a deployment base path', () => {
    expect(routeForPath('/json-converter/json-minify', '/json-converter/').mode).toBe('minify');
    expect(routeForPath('/json-converter/', '/json-converter/').path).toBe('/');
  });

  it('falls back to the landing page for unknown paths', () => {
    expect(routeForPath('/nope')).toBe(DEFAULT_ROUTE);
  });
});

describe('hrefFor', () => {
  it('builds root-relative hrefs by default', () => {
    expect(hrefFor('/')).toBe('/');
    expect(hrefFor('/json-repair')).toBe('/json-repair');
  });

  it('respects a deployment base path', () => {
    expect(hrefFor('/', '/json-converter/')).toBe('/json-converter/');
    expect(hrefFor('/json-repair', '/json-converter/')).toBe('/json-converter/json-repair');
  });
});
