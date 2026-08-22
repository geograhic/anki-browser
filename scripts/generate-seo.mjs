/**
 * SEO prerender for Anki Browser.
 *
 * Vite produces a single-page-app shell. This script reads the built shell and
 * injects crawlable, fully-rendered content for the indexable routes:
 *   - home            (/)
 *   - each deck page  (/deck/<slug>/)
 *   - about           (/about/)
 * plus sitemap.xml and robots.txt.
 *
 * All markup is produced by the shared builders in `src/content/render.mjs`, so
 * the static pages and the live SPA can never drift apart.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  renderMarkdown,
  decksGalleryHtml,
  deckArticleHtml,
  heroHtml,
  aboutBodyHtml,
  siteHeaderHtml,
  siteFooterHtml,
  seoLinks,
  jsonLdSite,
  jsonLdDeck,
  SITE_URL,
  SITE_TITLE,
  SITE_DESCRIPTION,
  SITE_KEYWORDS,
  SITE_IMAGE,
} from '../src/content/render.mjs';

// Deck metadata shape (mirrors DeckMeta in src/content/render.d.mts).
/** @typedef {{ slug:string, title:string, subtitle?:string, description?:string, tags?:string[], cover?:string, baiduLink?:string, previewFile?:string, markdown?:string, featured?:boolean, updated?:string }} DeckMeta */

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = resolve(root, 'dist');
const publicDir = resolve(root, 'public');

if (!existsSync(resolve(dist, 'index.html'))) {
  console.error('dist/index.html not found. Run `vite build` first.');
  process.exit(1);
}

const built = readFileSync(resolve(dist, 'index.html'), 'utf8');
const decks = JSON.parse(readFileSync(resolve(publicDir, 'decks/index.json'), 'utf8'));

function descAttr(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Wrap prerendered body content in the built shell with extra head tags. */
function buildPage({ title, description, canonical, jsonLd, inner, ogType = 'website', image = SITE_IMAGE, noindex = false }) {
  let html = built;
  html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${descAttr(title)}</title>`);
  html = html.replace(
    /<meta name="description"[^>]*>/,
    `<meta name="description" content="${descAttr(description)}" />`,
  );

  const head = [
    `<link rel="canonical" href="${canonical}" />`,
    `<meta name="robots" content="${noindex ? 'noindex,follow' : 'index,follow'},max-image-preview:large,max-snippet:-1" />`,
    `<meta name="keywords" content="${descAttr(SITE_KEYWORDS)}" />`,
    `<meta name="author" content="Endril" />`,
    `<meta name="theme-color" content="#2d7ff9" />`,
    `<meta name="application-name" content="${descAttr(SITE_TITLE)}" />`,
    `<meta name="generator" content="Anki Browser (static prerender)" />`,
    // Open Graph
    `<meta property="og:site_name" content="${descAttr(SITE_TITLE)}" />`,
    `<meta property="og:type" content="${descAttr(ogType)}" />`,
    `<meta property="og:title" content="${descAttr(title)}" />`,
    `<meta property="og:description" content="${descAttr(description)}" />`,
    `<meta property="og:url" content="${canonical}" />`,
    `<meta property="og:image" content="${image}" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta property="og:image:alt" content="${descAttr(SITE_TITLE)} — review Anki decks in your browser" />`,
    `<meta property="og:locale" content="en_US" />`,
    // Twitter Card
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:site" content="@endril" />`,
    `<meta name="twitter:creator" content="@endril" />`,
    `<meta name="twitter:title" content="${descAttr(title)}" />`,
    `<meta name="twitter:description" content="${descAttr(description)}" />`,
    `<meta name="twitter:image" content="${image}" />`,
    // Apple
    `<meta name="apple-mobile-web-app-title" content="${descAttr(SITE_TITLE)}" />`,
    `<meta name="apple-mobile-web-app-capable" content="yes" />`,
    `<meta name="apple-mobile-web-app-status-bar-style" content="default" />`,
    // Structured data
    `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>`,
  ].join('\n    ');
  html = html.replace('</head>', `    ${head}\n  </head>`);

  html = html.replace(
    /<div id="app"><\/div>/,
    `<div id="app">${inner}</div>`,
  );
  return html;
}

function writePage(relPath, html) {
  const out = resolve(dist, relPath);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, html);
  console.log('  wrote', relPath);
}

/* ---- Home ---- */
const gallery = decksGalleryHtml(decks, seoLinks);
const homeInner =
  siteHeaderHtml({ active: 'home', links: seoLinks }) +
  heroHtml(seoLinks) +
  `<section class="section"><div class="container"><div class="section-head"><h2>Shared decks</h2></div>${gallery}</div></section>` +
  siteFooterHtml();
writePage(
  'index.html',
  buildPage({
    title: `${SITE_TITLE} — review Anki decks in your browser`,
    description: SITE_DESCRIPTION,
    canonical: SITE_URL + '/',
    jsonLd: jsonLdSite(),
    inner: homeInner,
  }),
);

/* ---- Per-deck pages ---- */
for (const deck of decks) {
  const md = deck.markdown ? readFileSync(resolve(publicDir, 'decks', deck.markdown), 'utf8') : '';
  const mdHtml = md ? renderMarkdown(md) : '';
  const inner =
    siteHeaderHtml({ active: 'home', links: seoLinks }) +
    deckArticleHtml(deck, mdHtml, seoLinks) +
    siteFooterHtml();
  writePage(
    `deck/${deck.slug}/index.html`,
    buildPage({
      title: `${deck.title} — ${SITE_TITLE}`,
      description: deck.description || deck.subtitle || SITE_DESCRIPTION,
      canonical: `${SITE_URL}/deck/${deck.slug}/`,
      jsonLd: jsonLdDeck(deck),
      inner,
      ogType: 'article',
    }),
  );
}

/* ---- About ---- */
writePage(
  'about/index.html',
  buildPage({
    title: `About — ${SITE_TITLE}`,
    description: 'How Anki Browser works, and why your data stays on your device.',
    canonical: `${SITE_URL}/about/`,
    jsonLd: jsonLdSite(),
    inner: siteHeaderHtml({ active: 'about', links: seoLinks }) + aboutBodyHtml() + siteFooterHtml(),
  }),
);

/* ---- sitemap.xml ---- */
const today = new Date().toISOString().slice(0, 10);
const urls = [
  { loc: SITE_URL + '/', lastmod: today, priority: '1.0' },
  { loc: SITE_URL + '/about/', lastmod: today, priority: '0.6' },
  ...decks.map((d) => ({
    loc: `${SITE_URL}/deck/${d.slug}/`,
    lastmod: d.updated || today,
    priority: d.featured ? '0.9' : '0.7',
  })),
];
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) =>
      `  <url><loc>${u.loc}</loc><lastmod>${u.lastmod}</lastmod><priority>${u.priority}</priority></url>`,
  )
  .join('\n')}
</urlset>
`;
writeFileSync(resolve(dist, 'sitemap.xml'), sitemap);
console.log('  wrote sitemap.xml');

/* ---- robots.txt ---- */
writeFileSync(
  resolve(dist, 'robots.txt'),
  `User-agent: *\nAllow: /\nSitemap: ${SITE_URL}/sitemap.xml\n`,
);
console.log('  wrote robots.txt');
console.log('SEO prerender complete.');
