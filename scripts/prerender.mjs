/**
 * Post-build step: turn the single-page bundle into one real HTML file per
 * route, each with its own title, meta description, canonical URL, social
 * tags, JSON-LD and visible copy — so search engines index the page without
 * having to execute any JavaScript. Also emits sitemap.xml and robots.txt.
 *
 * Route definitions live in src/lib/routes.ts and are the single source of
 * truth shared with the React app.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { transform } from 'esbuild';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDir = path.join(projectRoot, 'dist');

/** Load routes.ts by stripping its types — it has no runtime imports. */
async function loadRoutes() {
  const source = fs.readFileSync(path.join(projectRoot, 'src/lib/routes.ts'), 'utf8');
  const { code } = await transform(source, { loader: 'ts', format: 'esm' });
  const tempFile = path.join(distDir, '.routes.generated.mjs');
  fs.writeFileSync(tempFile, code);
  try {
    return await import(pathToFileURL(tempFile).href);
  } finally {
    fs.rmSync(tempFile, { force: true });
  }
}

/**
 * Static hosts disagree about folder indexes. Netlify, Vercel and Cloudflare
 * Pages normally serve dist/foo/index.html at /foo; GitHub Pages and Cloudflare's
 * Workers-assets runtime serve it at /foo/ and redirect /foo to it. Declaring a
 * canonical that the host then redirects wastes crawl budget, so the form is a
 * build flag. After the first deploy, run:
 *
 *   curl -sI https://your-domain.com/json-stringify | head -1
 *
 * A 200 means keep the default; a 301/307/308 means rebuild with
 * TRAILING_SLASH=1.
 */
const TRAILING_SLASH = /^(1|true|yes)$/i.test(process.env.TRAILING_SLASH ?? '');

/** The URL form declared canonical, used for links, og:url and the sitemap. */
const canonicalPath = (routePath) => {
  if (routePath === '/') return '/';
  return TRAILING_SLASH ? `${routePath}/` : routePath;
};

const escapeHtml = (value) =>
  String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const absolute = (origin, routePath) => `${origin}${canonicalPath(routePath)}`;

function structuredData(origin, siteName, route, routes) {
  const url = absolute(origin, route.path);
  const graph = [
    {
      '@type': 'WebApplication',
      '@id': `${url}#app`,
      name: route.h1,
      url,
      applicationCategory: 'DeveloperApplication',
      operatingSystem: 'Any',
      browserRequirements: 'Requires JavaScript',
      description: route.description,
      isAccessibleForFree: true,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      publisher: { '@type': 'Organization', name: siteName, url: `${origin}/` },
    },
    {
      '@type': 'FAQPage',
      '@id': `${url}#faq`,
      mainEntity: route.faq.map((item) => ({
        '@type': 'Question',
        name: item.q,
        acceptedAnswer: { '@type': 'Answer', text: item.a },
      })),
    },
  ];

  if (route.path !== '/') {
    graph.push({
      '@type': 'BreadcrumbList',
      '@id': `${url}#breadcrumbs`,
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: siteName, item: `${origin}/` },
        { '@type': 'ListItem', position: 2, name: route.label, item: url },
      ],
    });
  }

  void routes;
  return JSON.stringify({ '@context': 'https://schema.org', '@graph': graph });
}

function headTags(origin, siteName, route, routes) {
  const url = absolute(origin, route.path);
  return [
    `<meta name="description" content="${escapeHtml(route.description)}" />`,
    `<link rel="canonical" href="${url}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="${escapeHtml(siteName)}" />`,
    `<meta property="og:title" content="${escapeHtml(route.title)}" />`,
    `<meta property="og:description" content="${escapeHtml(route.description)}" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta name="twitter:card" content="summary" />`,
    `<meta name="twitter:title" content="${escapeHtml(route.title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(route.description)}" />`,
    `<script type="application/ld+json">${structuredData(origin, siteName, route, routes)}</script>`,
  ].join('\n    ');
}

function seoSection(route, routes, basePath) {
  const href = (routePath) => {
    const p = canonicalPath(routePath);
    return p === '/' ? `${basePath}/` : `${basePath}${p}`;
  };

  const paragraphs = route.body.map((text) => `<p>${escapeHtml(text)}</p>`).join('\n      ');
  const faq = route.faq
    .map((item) => `<h3>${escapeHtml(item.q)}</h3>\n      <p>${escapeHtml(item.a)}</p>`)
    .join('\n      ');
  const links = routes
    .filter((other) => other.path !== route.path)
    .map(
      (other) =>
        `<li><a href="${href(other.path)}">${escapeHtml(other.label)}</a></li>`,
    )
    .join('\n        ');

  return `<hr class="seo-divider" />
    <section class="seo">
      <h1>${escapeHtml(route.h1)}</h1>
      <p class="seo-intro">${escapeHtml(route.intro)}</p>
      ${paragraphs}
      <h2>Frequently asked questions</h2>
      ${faq}
      <h2>Other JSON tools</h2>
      <ul class="seo-nav">
        ${links}
      </ul>
    </section>`;
}

function renderPage(template, origin, siteName, route, routes, basePath) {
  let html = template;
  html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(route.title)}</title>`);
  html = html.replace(/\s*<meta name="description"[^>]*>/g, '');
  html = html.replace('</head>', `  ${headTags(origin, siteName, route, routes)}\n  </head>`);
  html = html.replace('</body>', `  ${seoSection(route, routes, basePath)}\n  </body>`);
  return html;
}

function sitemap(origin, routes, lastmod) {
  const urls = routes
    .map(
      (route) =>
        `  <url>\n    <loc>${absolute(origin, route.path)}</loc>\n` +
        `    <lastmod>${lastmod}</lastmod>\n` +
        `    <changefreq>monthly</changefreq>\n` +
        `    <priority>${route.path === '/' ? '1.0' : '0.8'}</priority>\n  </url>`,
    )
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

async function main() {
  const templatePath = path.join(distDir, 'index.html');
  if (!fs.existsSync(templatePath)) {
    throw new Error('dist/index.html not found — run "vite build" first.');
  }

  const { ROUTES, SITE_URL, SITE_NAME } = await loadRoutes();
  const siteUrl = (process.env.SITE_URL ?? SITE_URL).replace(/\/+$/, '');
  const origin = siteUrl;
  // GitHub Pages project sites live under /<repo>/. Default the base path to
  // whatever path SITE_URL already carries so the two cannot disagree.
  const basePath = (process.env.BASE_PATH ?? new URL(`${siteUrl}/`).pathname).replace(/\/+$/, '');

  // dist/index.html is both the template and one of the outputs, so strip any
  // previously injected content to keep repeated runs idempotent.
  const template = fs
    .readFileSync(templatePath, 'utf8')
    .replace(/\s*<hr class="seo-divider"[\s\S]*?<\/section>/g, '')
    .replace(/\s*<link rel="canonical"[^>]*>/g, '')
    .replace(/\s*<meta property="og:[^>]*>/g, '')
    .replace(/\s*<meta name="twitter:[^>]*>/g, '')
    .replace(/\s*<script type="application\/ld\+json">[\s\S]*?<\/script>/g, '');
  const lastmod = new Date().toISOString().slice(0, 10);

  for (const route of ROUTES) {
    const html = renderPage(template, origin, SITE_NAME, route, ROUTES, basePath);
    const outDir = route.path === '/' ? distDir : path.join(distDir, route.path);
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, 'index.html'), html);
    console.log(`prerendered ${route.path.padEnd(22)} -> ${path.relative(projectRoot, path.join(outDir, 'index.html'))}`);
  }

  fs.writeFileSync(path.join(distDir, 'sitemap.xml'), sitemap(origin, ROUTES, lastmod));
  fs.writeFileSync(
    path.join(distDir, 'robots.txt'),
    `User-agent: *\nAllow: /\n\nSitemap: ${origin}/sitemap.xml\n`,
  );
  console.log(
    `\nwrote sitemap.xml and robots.txt for ${origin} ` +
      `(base path "${basePath || '/'}", canonical URLs ` +
      `${TRAILING_SLASH ? 'end with' : 'omit'} a trailing slash)`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
