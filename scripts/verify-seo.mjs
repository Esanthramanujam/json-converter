/**
 * Checks the prerendered output before you ship it. Run after `npm run build`:
 *
 *   npm run verify:seo
 *
 * Fails the process if a page would be indexed badly: a truncated title, a
 * description outside the length Google renders, a missing canonical, more or
 * fewer than one <h1>, invalid JSON-LD, thin copy, a broken asset path, or two
 * pages sharing a title or description.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { transform } from 'esbuild';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDir = path.join(projectRoot, 'dist');

const MIN_DESCRIPTION = 110;
const MAX_DESCRIPTION = 175;
const MAX_TITLE = 62;
const MIN_WORDS = 220;

let failures = 0;
const fail = (message) => {
  failures++;
  console.log('  FAIL  ' + message);
};

async function loadRoutes() {
  const source = fs.readFileSync(path.join(projectRoot, 'src/lib/routes.ts'), 'utf8');
  const { code } = await transform(source, { loader: 'ts', format: 'esm' });
  const tempFile = path.join(distDir, '.routes.verify.mjs');
  fs.writeFileSync(tempFile, code);
  try {
    return (await import(pathToFileURL(tempFile).href)).ROUTES;
  } finally {
    fs.rmSync(tempFile, { force: true });
  }
}

const routes = await loadRoutes();
const seen = new Map();

for (const route of routes) {
  const file = path.join(distDir, route.path, 'index.html');
  console.log('\n' + route.path);
  if (!fs.existsSync(file)) {
    fail('no prerendered file at ' + path.relative(projectRoot, file));
    continue;
  }
  const html = fs.readFileSync(file, 'utf8');

  const title = /<title>([\s\S]*?)<\/title>/.exec(html)?.[1] ?? '';
  console.log('  title       (' + String(title.length).padStart(2) + ')  ' + title);
  if (!title) fail('missing title');
  if (title.length > MAX_TITLE) fail(`title is ${title.length} chars, will truncate past ${MAX_TITLE}`);

  const description = /<meta name="description" content="([^"]*)"/.exec(html)?.[1] ?? '';
  console.log('  description (' + description.length + ')');
  if (description.length < MIN_DESCRIPTION || description.length > MAX_DESCRIPTION) {
    fail(`description is ${description.length} chars, want ${MIN_DESCRIPTION}-${MAX_DESCRIPTION}`);
  }

  const canonical = /<link rel="canonical" href="([^"]*)"/.exec(html)?.[1];
  console.log('  canonical   ' + canonical);
  if (!canonical) fail('missing canonical link');
  else if (!canonical.replace(/\/$/, '').endsWith(route.path.replace(/\/$/, ''))) {
    fail(`canonical ${canonical} does not match route ${route.path}`);
  }

  const h1s = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/g)];
  console.log('  h1          ' + h1s.map((m) => m[1]).join(' / '));
  if (h1s.length !== 1) fail(`expected exactly one <h1>, found ${h1s.length}`);

  const ld = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(html)?.[1];
  try {
    const graph = JSON.parse(ld)['@graph'];
    console.log('  json-ld     ' + graph.map((node) => node['@type']).join(', '));
    const faq = graph.find((node) => node['@type'] === 'FAQPage');
    if (!faq || faq.mainEntity.length < 2) fail('FAQPage needs at least two questions');
  } catch {
    fail('JSON-LD is missing or not valid JSON');
  }

  const words = html
    .replace(/<script[\s\S]*?<\/script>/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ').length;
  console.log('  copy        ' + words + ' words');
  if (words < MIN_WORDS) fail(`thin content: ${words} words, want at least ${MIN_WORDS}`);

  // Asset URLs carry the deployment base path (/repo/assets/... on a GitHub
  // Pages project site), so compare from the /assets/ segment onwards.
  const assets = [...html.matchAll(/(?:src|href)="([^"]*\/assets\/[^"]+)"/g)].map((m) => m[1]);
  if (!assets.length) fail('no /assets/ references — check the Vite base path');
  for (const asset of assets) {
    const relative = asset.slice(asset.indexOf('/assets/'));
    if (!fs.existsSync(path.join(distDir, relative))) fail('asset does not exist: ' + asset);
  }

  const key = title + '||' + description;
  if (seen.has(key)) fail(`duplicate title/description shared with ${seen.get(key)}`);
  seen.set(key, route.path);
}

const sitemapPath = path.join(distDir, 'sitemap.xml');
if (!fs.existsSync(sitemapPath)) {
  fail('sitemap.xml was not written');
} else {
  const locs = [...fs.readFileSync(sitemapPath, 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)];
  console.log('\nsitemap.xml   ' + locs.length + ' urls');
  if (locs.length !== routes.length) fail(`sitemap lists ${locs.length} urls, expected ${routes.length}`);
}
if (!fs.existsSync(path.join(distDir, 'robots.txt'))) fail('robots.txt was not written');

console.log('\n' + (failures === 0 ? 'All SEO checks passed.' : `${failures} check(s) failed.`));
process.exit(failures === 0 ? 0 : 1);
