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
  viewerBodyHtml,
  viewerContent,
  zhHomeBodyHtml,
  jsonLdFaq,
  SITE_URL,
  SITE_TITLE,
  SITE_DESCRIPTION,
  SITE_KEYWORDS,
  SITE_IMAGE,
} from '../src/content/render.mjs';

// Deck metadata shape (mirrors DeckMeta in src/content/render.d.mts).
/** @typedef {{ slug:string, title:string, subtitle?:string, description?:string, tags?:string[], cover?:string, downloads?:{url:string,label?:string,note?:string}[], baiduLink?:string, content?:string, markdown?:string, previewFile?:string, featured?:boolean, updated?:string }} DeckMeta */

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

/**
 * Wrap prerendered body content in the built shell with extra head tags.
 *
 * The source `index.html` carries its own copy of every SEO tag. For every
 * prerendered page we want a single, canonical set of meta — so this function
 * strips the source's existing title/description/canonical/hreflang/og/twitter/
 * keywords/robots/author/apple-mobile-web-app/theme-color, then injects the
 * per-page set.
 *
 * @param {{hreflang:string,href:string}[]} altLinks language alternates
 * @param {string} locale BCP-47, e.g. en_US / zh_CN
 */
function buildPage({
  title,
  description,
  canonical,
  jsonLd,
  inner,
  ogType = 'website',
  image = SITE_IMAGE,
  noindex = false,
  altLinks = [],
  locale = 'en_US',
  localeAlternates = [],
}) {
  let html = built;

  // Strip pre-existing SEO meta from the source shell so we don't emit duplicates.
  html = html
    .replace(/<title>[\s\S]*?<\/title>/, '')
    .replace(/<meta\s+name="description"[^>]*>\n?\s*/g, '')
    .replace(/<link\s+rel="canonical"[^>]*>\n?\s*/g, '')
    .replace(/<link\s+rel="alternate"\s+hreflang[^>]*>\n?\s*/g, '')
    .replace(
      /<meta\s+(?:name|property)="(?:og:[^"]+|twitter:[^"]+|keywords|robots|author|application-name|generator|apple-mobile-web-app-[^"]+)"[^>]*>\n?\s*/g,
      '',
    )
    .replace(/<meta\s+name="theme-color"[^>]*>\n?\s*/g, '');

  const head = [
    `<title>${descAttr(title)}</title>`,
    `<meta name="description" content="${descAttr(description)}" />`,
    `<link rel="canonical" href="${canonical}" />`,
    ...altLinks.map(
      (l) => `<link rel="alternate" hreflang="${descAttr(l.hreflang)}" href="${descAttr(l.href)}" />`,
    ),
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
    `<meta property="og:image:alt" content="${descAttr(SITE_TITLE)} — open, browse and review .apkg / .colpkg decks in your browser" />`,
    `<meta property="og:locale" content="${descAttr(locale)}" />`,
    ...localeAlternates.map((loc) => `<meta property="og:locale:alternate" content="${descAttr(loc)}" />`),
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
    // Structured data (arrays become a @graph)
    `<script type="application/ld+json">${JSON.stringify(
      Array.isArray(jsonLd) ? { '@context': 'https://schema.org', '@graph': jsonLd } : jsonLd,
    )}</script>`,
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
    title: 'Anki Browser — Open, Browse & Review .apkg / .colpkg Online',
    description: SITE_DESCRIPTION,
    canonical: SITE_URL + '/',
    jsonLd: jsonLdSite(),
    inner: homeInner,
    localeAlternates: ['zh_CN'],
    altLinks: [
      { hreflang: 'en', href: SITE_URL + '/' },
      { hreflang: 'zh', href: SITE_URL + '/zh/' },
      { hreflang: 'x-default', href: SITE_URL + '/' },
    ],
  }),
);

/* ---- Per-deck pages ---- */
for (const deck of decks) {
  // Inline `content` wins; legacy per-deck .md file is the fallback.
  const mdSource =
    typeof deck.content === 'string' && deck.content.trim()
      ? deck.content
      : deck.markdown
        ? readFileSync(resolve(publicDir, 'decks', deck.markdown), 'utf8')
        : '';
  const mdHtml = mdSource ? renderMarkdown(mdSource) : '';
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

/* ---- Viewer landing pages (.apkg / .colpkg, EN + ZH) ---- */
const viewerPages = [
  {
    fmt: 'apkg',
    lang: 'en',
    path: 'apkg-viewer/index.html',
    title: 'APKG Viewer — Open .apkg Files Online (No Anki Needed)',
    description:
      'Free online APKG viewer: open, browse and review .apkg Anki decks in your browser. No install, no registration, no upload — your file never leaves your device.',
  },
  {
    fmt: 'colpkg',
    lang: 'en',
    path: 'colpkg-viewer/index.html',
    title: 'COLPKG Viewer — Open .colpkg Files Online (No Anki Needed)',
    description:
      'Free online COLPKG viewer: open, browse and review .colpkg Anki collection backups in your browser. No install, no registration, no upload.',
  },
  {
    fmt: 'apkg',
    lang: 'zh',
    path: 'zh/apkg-viewer/index.html',
    title: 'APKG 查看器 — 在线打开 .apkg 卡组，无需安装 Anki',
    description:
      '.apkg 是 Anki 分享卡组格式。用免费的在线 APKG 查看器在浏览器里直接打开、浏览和复习，无需安装 Anki、无需注册，文件绝不上传。',
  },
  {
    fmt: 'colpkg',
    lang: 'zh',
    path: 'zh/colpkg-viewer/index.html',
    title: 'COLPKG 查看器 — 在线打开 .colpkg 卡组，无需安装 Anki',
    description:
      '.colpkg 是 Anki 收藏库备份格式。用免费的在线 COLPKG 查看器在浏览器里打开整个收藏库并复习，无需安装 Anki，文件绝不上传。',
  },
];

for (const p of viewerPages) {
  const inner =
    siteHeaderHtml({ active: 'home', links: seoLinks }) +
    viewerBodyHtml({ fmt: p.fmt, lang: p.lang, links: seoLinks }) +
    siteFooterHtml();
  const canonical = `${SITE_URL}/${p.path.replace(/\/index\.html$/, '/')}`;
  const enTwin =
    p.lang === 'zh'
      ? `${SITE_URL}/${p.fmt}-viewer/`
      : `${SITE_URL}/zh/${p.fmt}-viewer/`;
  const isZh = p.lang === 'zh';
  writePage(
    p.path,
    buildPage({
      title: p.title,
      description: p.description,
      canonical,
      jsonLd: [jsonLdSite(), jsonLdFaq(viewerContent(p.fmt, p.lang).faq)],
      inner,
      locale: isZh ? 'zh_CN' : 'en_US',
      localeAlternates: isZh ? ['en_US'] : ['zh_CN'],
      altLinks: [
        { hreflang: 'en', href: p.lang === 'zh' ? enTwin : canonical },
        { hreflang: 'zh', href: p.lang === 'zh' ? canonical : enTwin },
        { hreflang: 'x-default', href: p.lang === 'zh' ? enTwin : canonical },
      ],
    }),
  );
}

/* ---- Chinese home (/) ---- */
writePage(
  'zh/index.html',
  buildPage({
    title: '在线打开并复习 .apkg / .colpkg 卡组 — Anki Browser 中文版',
    description:
      '无需安装 Anki、无需注册，直接在浏览器里打开、浏览和复习 .apkg / .colpkg Anki 卡组。文件本地解析，绝不上传。支持图片、音频、挖空与 SM-2 间隔重复复习。',
    canonical: `${SITE_URL}/zh/`,
    jsonLd: [jsonLdSite()],
    inner:
      siteHeaderHtml({ active: 'home', links: seoLinks }) +
      zhHomeBodyHtml(seoLinks) +
      siteFooterHtml(),
    locale: 'zh_CN',
    localeAlternates: ['en_US'],
    altLinks: [
      { hreflang: 'zh', href: SITE_URL + '/zh/' },
      { hreflang: 'en', href: SITE_URL + '/' },
      { hreflang: 'x-default', href: SITE_URL + '/' },
    ],
  }),
);

/* ---- sitemap.xml ---- */
const today = new Date().toISOString().slice(0, 10);
const urls = [
  { loc: SITE_URL + '/', lastmod: today, priority: '1.0' },
  { loc: SITE_URL + '/about/', lastmod: today, priority: '0.6' },
  { loc: SITE_URL + '/apkg-viewer/', lastmod: today, priority: '0.8' },
  { loc: SITE_URL + '/colpkg-viewer/', lastmod: today, priority: '0.8' },
  { loc: SITE_URL + '/zh/', lastmod: today, priority: '0.8' },
  { loc: SITE_URL + '/zh/apkg-viewer/', lastmod: today, priority: '0.8' },
  { loc: SITE_URL + '/zh/colpkg-viewer/', lastmod: today, priority: '0.8' },
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
