/**
 * SEO prerender for Anki Browser.
 *
 * Vite produces a single-page-app shell. This script reads the built shell and
 * injects crawlable, fully-rendered content for every indexable route, in BOTH
 * languages:
 *
 *   EN  /                /about/        /faq/        /privacy/
 *        /terms/         /content-policy/  /contact/   /submit/
 *        /apkg-viewer/   /colpkg-viewer/   /deck/<slug>/
 *   ZH  /zh/… mirrors of every page above except deck pages
 *
 * Deck pages stay language-neutral on purpose: the deck copy is whatever the
 * submitter wrote, so a translated twin would be duplicate content.
 *
 * All markup is produced by the shared builders in `src/content/render.mjs`,
 * so the static pages and the live SPA can never drift apart. Page copy lives
 * in `pages.mjs`, chrome strings in `i18n.mjs` (parity-checked at build time).
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
  faqBodyHtml,
  legalBodyHtml,
  submitBodyHtml,
  homeBodyHtml,
  siteHeaderHtml,
  siteFooterHtml,
  seoLinks,
  localizeLinks,
  htmlLang,
  ogLocales,
  jsonLdSite,
  jsonLdDeck,
  jsonLdFaq,
  jsonLdOrganization,
  jsonLdBreadcrumb,
  jsonLdWebPage,
  viewerBodyHtml,
  viewerContent,
  SITE_URL,
  SITE_TITLE,
  SITE_DESCRIPTION,
  SITE_KEYWORDS,
  SITE_IMAGE,
  CONTENT_UPDATED,
  REPO_URL,
} from '../src/content/render.mjs';
import { faqContent, aboutContent } from '../src/content/pages.mjs';
import { t, normalizeLang } from '../src/content/i18n.mjs';

// Deck metadata shape (mirrors DeckMeta in src/content/render.d.mts).
/** @typedef {{ slug:string, title:string, subtitle?:string, description?:string, tags?:string[], cover?:string, downloads?:{url:string,label?:string,note?:string}[], baiduLink?:string, content?:string, markdown?:string, previewFile?:string, featured?:boolean, updated?:string, author?:{name?:string,url?:string}|string, license?:string }} DeckMeta */

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
  lang = 'en',
  ogType = 'website',
  image = SITE_IMAGE,
  noindex = false,
  altLinks = [],
}) {
  let html = built;

  // The <html lang> of the shell is EN; static pages must match their content.
  html = html.replace(/<html lang="en">/, `<html lang="${descAttr(htmlLang(lang))}">`);

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

  const { locale, alternates } = ogLocales(lang);
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
    ...alternates.map((loc) => `<meta property="og:locale:alternate" content="${descAttr(loc)}" />`),
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

/** Canonical path (no language prefix) for a mirrored page key. */
const CANONICAL_PATH = {
  home: '/',
  about: '/about/',
  faq: '/faq/',
  privacy: '/privacy/',
  terms: '/terms/',
  contentPolicy: '/content-policy/',
  contact: '/contact/',
  submit: '/submit/',
  apkgViewer: '/apkg-viewer/',
  colpkgViewer: '/colpkg-viewer/',
};

/** Chrome shared by every static page of one language. */
function chrome(key, lang) {
  return {
    header: siteHeaderHtml({
      active: key === 'home' ? 'home' : key === 'about' ? 'about' : '',
      links: localizeLinks(seoLinks, lang),
      lang,
      pageKey: key,
    }),
    footer: siteFooterHtml({ links: localizeLinks(seoLinks, lang), lang }),
  };
}

/**
 * Emit one mirrored page in both languages, with reciprocal hreflang pairs.
 *
 * @param {object} p
 * @param {string} p.key route key (also the meta.i18n prefix, e.g. meta.faqTitle)
 * @param {(lang: string, links: object) => string} p.body page body builder
 * @param {(lang: string, canonical: string) => object[]} [p.jsonLd]
 */
function emitMirroredPage({ key, body, jsonLd }) {
  const path = CANONICAL_PATH[key];
  for (const lang of ['en', 'zh']) {
    const norm = normalizeLang(lang);
    const prefix = norm === 'zh' ? '/zh' : '';
    // No leading slash: path.join/resolve would treat it as drive-absolute.
    const fileRel = norm === 'zh'
      ? `zh${path === '/' ? '/' : path}index.html`.replace('//', '/')
      : path === '/'
        ? 'index.html'
        : `${path.slice(1)}index.html`;
    const canonical = SITE_URL + prefix + (path === '/' ? '/' : path);
    const links = localizeLinks(seoLinks, norm);
    const { header, footer } = chrome(key, norm);
    const enHref = SITE_URL + path;
    const zhHref = SITE_URL + '/zh' + path;

    const faqs = key === 'faq' ? faqContent(norm).faq : undefined;
    const ld = [
      ...(jsonLd ? jsonLd(norm, canonical) : []),
      jsonLdWebPage({
        name: t(norm, `meta.${key}Title`),
        url: canonical,
        description: t(norm, `meta.${key}Desc`),
        lang: norm,
      }),
      jsonLdBreadcrumb([
        { name: SITE_TITLE, url: SITE_URL + '/' },
        { name: t(norm, `meta.${key}Title`), url: canonical },
      ]),
    ];
    if (key === 'faq' && faqs) ld.unshift(jsonLdFaq(faqs));
    if (key === 'contact') ld.unshift(jsonLdOrganization());

    writePage(
      fileRel,
      buildPage({
        title: t(norm, `meta.${key}Title`),
        description: t(norm, `meta.${key}Desc`),
        canonical,
        jsonLd: ld,
        inner: header + body(norm, links) + footer,
        lang: norm,
        altLinks: [
          { hreflang: 'en', href: enHref },
          { hreflang: 'zh', href: zhHref },
          { hreflang: 'x-default', href: enHref },
        ],
      }),
    );
  }
}

/* ------------------------------------------------------------------ */
/* Mirrored pages                                                      */
/* ------------------------------------------------------------------ */

console.log('Prerendering mirrored pages (EN + ZH)…');

emitMirroredPage({
  key: 'home',
  body: (lang, links) =>
    homeBodyHtml({
      links,
      lang,
      galleryHtml: decksGalleryHtml(decks, links, { lang, shareCard: true }),
    }),
});

emitMirroredPage({
  key: 'about',
  body: (lang, links) => aboutBodyHtml(links, lang),
});

emitMirroredPage({
  key: 'faq',
  body: (lang, links) => faqBodyHtml(links, lang),
});

emitMirroredPage({
  key: 'privacy',
  body: (lang, links) => legalBodyHtml('privacy', links, lang),
});

emitMirroredPage({
  key: 'terms',
  body: (lang, links) => legalBodyHtml('terms', links, lang),
});

emitMirroredPage({
  key: 'contentPolicy',
  body: (lang, links) => legalBodyHtml('content', links, lang),
});

emitMirroredPage({
  key: 'contact',
  body: (lang, links) => legalBodyHtml('contact', links, lang),
});

emitMirroredPage({
  key: 'submit',
  body: (lang, links) =>
    submitBodyHtml({
      links,
      lang,
      signInUrl: `${SITE_URL}/api/oauth/login?next=${encodeURIComponent(SITE_URL + '/submit/')}`,
    }),
});

/* ------------------------------------------------------------------ */
/* Viewer landing pages (.apkg / .colpkg)                              */
/* ------------------------------------------------------------------ */

console.log('Prerendering viewer landing pages…');
const viewerPages = [
  { fmt: 'apkg', lang: 'en', path: 'apkg-viewer/index.html', key: 'apkgViewer' },
  { fmt: 'colpkg', lang: 'en', path: 'colpkg-viewer/index.html', key: 'colpkgViewer' },
  { fmt: 'apkg', lang: 'zh', path: 'zh/apkg-viewer/index.html', key: 'zhApkg' },
  { fmt: 'colpkg', lang: 'zh', path: 'zh/colpkg-viewer/index.html', key: 'zhColpkg' },
];

for (const p of viewerPages) {
  const norm = normalizeLang(p.lang);
  const links = localizeLinks(seoLinks, norm);
  const { header, footer } = chrome('home', norm);
  const canonical = `${SITE_URL}/${p.path.replace(/\/index\.html$/, '/')}`;
  const enTwin = norm === 'zh' ? `${SITE_URL}/${p.fmt}-viewer/` : canonical;
  const zhTwin = norm === 'zh' ? canonical : `${SITE_URL}/zh/${p.fmt}-viewer/`;

  writePage(
    p.path,
    buildPage({
      title: t(norm, `meta.${p.key}Title`),
      description: t(norm, `meta.${p.key}Desc`),
      canonical,
      jsonLd: [
        jsonLdFaq(viewerContent(p.fmt, norm).faq),
        jsonLdWebPage({
          name: t(norm, `meta.${p.key}Title`),
          url: canonical,
          description: t(norm, `meta.${p.key}Desc`),
          lang: norm,
        }),
        jsonLdBreadcrumb([
          { name: SITE_TITLE, url: SITE_URL + '/' },
          { name: t(norm, `meta.${p.key}Title`), url: canonical },
        ]),
      ],
      inner: header + viewerBodyHtml({ fmt: p.fmt, lang: norm, links }) + footer,
      lang: norm,
      altLinks: [
        { hreflang: 'en', href: enTwin },
        { hreflang: 'zh', href: zhTwin },
        { hreflang: 'x-default', href: enTwin },
      ],
    }),
  );
}

/* ------------------------------------------------------------------ */
/* Deck pages (language-neutral, EN chrome)                            */
/* ------------------------------------------------------------------ */

console.log('Prerendering deck pages…');
for (const deck of decks) {
  // Inline `content` wins; legacy per-deck .md file is the fallback.
  const mdSource =
    typeof deck.content === 'string' && deck.content.trim()
      ? deck.content
      : deck.markdown
        ? readFileSync(resolve(publicDir, 'decks', deck.markdown), 'utf8')
        : '';
  const mdHtml = mdSource ? renderMarkdown(mdSource) : '';
  const canonical = `${SITE_URL}/deck/${deck.slug}/`;
  // Deck pages are language-neutral: the switcher keeps the visitor here and
  // flips the interface language client-side instead of navigating away.
  const header = siteHeaderHtml({
    active: 'home',
    links: seoLinks,
    lang: 'en',
    pageKey: 'home',
    switchHref: canonical,
  });
  const inner =
    header + deckArticleHtml(deck, mdHtml, seoLinks, 'en') + siteFooterHtml({ links: seoLinks, lang: 'en' });
  writePage(
    `deck/${deck.slug}/index.html`,
    buildPage({
      title: `${deck.title} — ${SITE_TITLE}`,
      description: deck.description || deck.subtitle || SITE_DESCRIPTION,
      canonical,
      jsonLd: [
        jsonLdDeck(deck),
        jsonLdBreadcrumb([
          { name: SITE_TITLE, url: SITE_URL + '/' },
          { name: deck.title, url: canonical },
        ]),
      ],
      inner,
      ogType: 'article',
      image: deck.cover || SITE_IMAGE,
    }),
  );
}

/* ------------------------------------------------------------------ */
/* sitemap.xml / robots.txt / llms.txt                                 */
/* ------------------------------------------------------------------ */

console.log('Writing sitemap.xml, robots.txt, llms.txt…');
const today = new Date().toISOString().slice(0, 10);

/** @type {{loc:string, lastmod?:string, priority:string, alt?:{en:string,zh:string}}[]} */
const urls = [];
for (const [key, path] of Object.entries(CANONICAL_PATH)) {
  const priority = key === 'home' ? '1.0' : key === 'submit' ? '0.8' : '0.7';
  urls.push({
    loc: SITE_URL + path,
    priority,
    alt: { en: SITE_URL + path, zh: SITE_URL + '/zh' + path },
  });
}
urls.push({ loc: `${SITE_URL}/apkg-viewer/`, priority: '0.8', alt: { en: `${SITE_URL}/apkg-viewer/`, zh: `${SITE_URL}/zh/apkg-viewer/` } });
urls.push({ loc: `${SITE_URL}/colpkg-viewer/`, priority: '0.8', alt: { en: `${SITE_URL}/colpkg-viewer/`, zh: `${SITE_URL}/zh/colpkg-viewer/` } });
for (const d of decks) {
  urls.push({
    loc: `${SITE_URL}/deck/${d.slug}/`,
    lastmod: d.updated || today,
    priority: d.featured ? '0.9' : '0.7',
  });
}

const urlEntries = urls
  .map((u) => {
    const lastmod = u.lastmod ?? today;
    const alts = u.alt
      ? Object.entries(u.alt)
          .map(
            ([l, href]) =>
              `    <xhtml:link rel="alternate" hreflang="${l}" href="${href}"/>`,
          )
          .join('\n')
      : '';
    return [
      '  <url>',
      `    <loc>${u.loc}</loc>`,
      ...(alts ? [alts] : []),
      `    <lastmod>${lastmod}</lastmod>`,
      `    <priority>${u.priority}</priority>`,
      '  </url>',
    ]
      .filter(Boolean)
      .join('\n');
  })
  .join('\n');

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urlEntries}
</urlset>
`;
writeFileSync(resolve(dist, 'sitemap.xml'), sitemap);

writeFileSync(
  resolve(dist, 'robots.txt'),
  `User-agent: *\nAllow: /\nDisallow: /api/\nSitemap: ${SITE_URL}/sitemap.xml\n`,
);

/* llms.txt — the concise, machine-first summary for generative engines (GEO). */
writeFileSync(
  resolve(dist, 'llms.txt'),
  `# Anki Browser

> Free, open-source web app to open, browse and review Anki flashcard decks
> (.apkg shared decks and .colpkg collection backups) directly in the browser.
> No Anki install, no account, no upload: files are parsed locally with
> WebAssembly and never leave the visitor's device.

Maintained by Endril (${'https://endril.com'}). Source: ${REPO_URL}.
Available in English and Chinese (every page has a /zh/ twin).

## Key facts

- Formats: .apkg (shared deck) and .colpkg (full collection backup)
- Parsing: 100% client-side (WebAssembly + SQLite), no server-side processing
- Reviewing: classic SM-2 spaced repetition (Again / Hard / Good / Easy), same intervals as Anki
- Media: images, audio and cloze deletions render inline
- Progress: stored locally in IndexedDB per deck; never uploaded; no cross-device sync by design
- Privacy: no tracking, no analytics, no cookies for browsing; GitHub sign-in (read-only profile) only for deck submissions
- Deck gallery: curated list linking to decks hosted by their authors; submissions are reviewed before publication

## Main pages

- Home: ${SITE_URL}/
- APKG viewer: ${SITE_URL}/apkg-viewer/
- COLPKG viewer: ${SITE_URL}/colpkg-viewer/
- FAQ: ${SITE_URL}/faq/
- Share a deck: ${SITE_URL}/submit/
- About: ${SITE_URL}/about/
- Privacy policy: ${SITE_URL}/privacy/
- Terms: ${SITE_URL}/terms/
- Content policy & DMCA: ${SITE_URL}/content-policy/
- Contact: ${SITE_URL}/contact/
- Chinese home: ${SITE_URL}/zh/

## Shared decks

${decks.map((d) => `- ${d.title}: ${SITE_URL}/deck/${d.slug}/ — ${d.subtitle ?? d.description ?? ''}`).join('\n')}
`,
);

console.log('SEO prerender complete.');
