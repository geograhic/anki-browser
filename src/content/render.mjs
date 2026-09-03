/**
 * Shared, DOM-free HTML builders for Anki Browser.
 *
 * Imported by BOTH the browser SPA (`src/content/decks.ts`, the page modules)
 * and the Node SEO prerender script (`scripts/generate-seo.mjs`). Keeping every
 * piece of user-facing markup here means the crawlable static pages and the live
 * app can never drift apart — one source of truth, two consumers.
 *
 * This file is plain JavaScript (no type syntax) so Vite/Rollup can bundle it
 * directly; the matching types live in `render.d.mts`.
 *
 * Copy that belongs to a page lives in `pages.mjs`; strings for chrome and
 * controls live in `i18n.mjs`. This module only turns them into markup.
 */

import { t, tl, LANG_META, otherLang, normalizeLang } from './i18n.mjs';
import {
  viewerContent,
  aboutContent,
  faqContent,
  legalContent,
  SITE_URL as PAGES_SITE_URL,
  CONTENT_UPDATED,
  REPO_URL,
  SUBMISSIONS_REPO_URL,
  OWNER_URL,
  OWNER_GITHUB,
  CONTACT_EMAIL,
  SUPPORTED_LICENSES,
} from './pages.mjs';

/** Re-exported so existing importers keep working unchanged. */
export { viewerContent, REPO_URL, SUBMISSIONS_REPO_URL, CONTACT_EMAIL, SUPPORTED_LICENSES, CONTENT_UPDATED };

export const SITE_URL = PAGES_SITE_URL;
export const SITE_TITLE = 'Anki Browser';
export const SITE_TAGLINE =
  'Open, browse and review Anki decks right in your browser — no Anki software to install, no account, and your files never leave your device.';
export const SITE_DESCRIPTION =
  'Free online .apkg / .colpkg viewer: open, browse and review Anki decks in your browser — no registration, no Anki software needed. SM-2 spaced-repetition scheduler, media and cloze support, 100% local. Your data never leaves your device.';
export const SITE_KEYWORDS = [
  'Anki',
  'Anki browser',
  '.apkg',
  '.colpkg',
  'apkg viewer',
  'colpkg viewer',
  'open apkg online',
  'apkg file viewer',
  'anki deck viewer',
  'flashcards',
  'spaced repetition',
  'SM-2',
  'browse Anki online',
  'review without Anki',
  'no account',
  'no registration',
  'no upload',
  'private',
  'cloze',
  'apkg 查看器',
  'colpkg 浏览器',
  'anki 卡组 在线预览',
].join(', ');
/** Absolute URL of the Open Graph share image (1200x630 PNG — SVG is not read by all crawlers). */
export const SITE_IMAGE = SITE_URL + '/og-image.png';

/* -------------------------------------------------------------------------- */
/* Route tables                                                                */
/* -------------------------------------------------------------------------- */

/**
 * Canonical paths, relative to SITE_URL. Pages that exist in both languages
 * have a `zh*` twin; `deck`, `open`, `study` and `admin` are language-neutral.
 */
const SEO_PATHS = {
  home: '/',
  about: '/about/',
  open: '/#/open',
  faq: '/faq/',
  privacy: '/privacy/',
  terms: '/terms/',
  contentPolicy: '/content-policy/',
  contact: '/contact/',
  submit: '/submit/',
  admin: '/#/admin',
  apkgViewer: '/apkg-viewer/',
  colpkgViewer: '/colpkg-viewer/',
  zhHome: '/zh/',
  zhAbout: '/zh/about/',
  zhFaq: '/zh/faq/',
  zhPrivacy: '/zh/privacy/',
  zhTerms: '/zh/terms/',
  zhContentPolicy: '/zh/content-policy/',
  zhContact: '/zh/contact/',
  zhSubmit: '/zh/submit/',
  zhApkg: '/zh/apkg-viewer/',
  zhColpkg: '/zh/colpkg-viewer/',
};

/** Hash routes used by the SPA. */
const APP_PATHS = {
  home: '#/',
  about: '#/about',
  open: '#/open',
  faq: '#/faq',
  privacy: '#/privacy',
  terms: '#/terms',
  contentPolicy: '#/content-policy',
  contact: '#/contact',
  submit: '#/submit',
  admin: '#/admin',
  apkgViewer: '#/apkg-viewer',
  colpkgViewer: '#/colpkg-viewer',
  zhHome: '#/zh',
  zhAbout: '#/zh/about',
  zhFaq: '#/zh/faq',
  zhPrivacy: '#/zh/privacy',
  zhTerms: '#/zh/terms',
  zhContentPolicy: '#/zh/content-policy',
  zhContact: '#/zh/contact',
  zhSubmit: '#/zh/submit',
  zhApkg: '#/zh/apkg-viewer',
  zhColpkg: '#/zh/colpkg-viewer',
};

/**
 * Bidirectional map between a page and its translation twin.
 * Keys not listed here are language-neutral (no twin to switch to).
 */
export const LANG_TWIN = {
  home: 'zhHome',
  about: 'zhAbout',
  faq: 'zhFaq',
  privacy: 'zhPrivacy',
  terms: 'zhTerms',
  contentPolicy: 'zhContentPolicy',
  contact: 'zhContact',
  submit: 'zhSubmit',
  apkgViewer: 'zhApkg',
  colpkgViewer: 'zhColpkg',
  zhHome: 'home',
  zhAbout: 'about',
  zhFaq: 'faq',
  zhPrivacy: 'privacy',
  zhTerms: 'terms',
  zhContentPolicy: 'contentPolicy',
  zhContact: 'contact',
  zhSubmit: 'submit',
  zhApkg: 'apkgViewer',
  zhColpkg: 'colpkgViewer',
};

/** Keys with a translation twin, in their English spelling. */
const MIRRORED_KEYS = Object.keys(LANG_TWIN).filter((k) => !k.startsWith('zh'));

function buildLinks(paths, mode) {
  const seo = mode === 'seo';
  const linkPrefix = seo ? SITE_URL : '';
  const links = {};
  for (const [key, path] of Object.entries(paths)) {
    links[key] = () => linkPrefix + path;
  }
  // SEO pages use real paths; the SPA navigates by hash.
  links.deck = (slug) => (seo ? `${SITE_URL}/deck/${slug}/` : `#/deck/${slug}`);
  links.study = (slug) =>
    seo
      ? `${SITE_URL}/#/study?deck=${encodeURIComponent(slug)}`
      : `#/study?deck=${encodeURIComponent(slug)}`;
  return links;
}

/** Link set; the SPA uses hash routes, the prerender uses canonical paths. */
export const seoLinks = buildLinks(SEO_PATHS, 'seo');
export const appLinks = buildLinks(APP_PATHS, 'app');

/**
 * Resolve a link set for one language: every mirrored key points at that
 * language's URL, so page builders can stay language-agnostic.
 *
 * @param {Record<string, Function>} links `seoLinks` or `appLinks`
 * @param {string} lang
 */
export function localizeLinks(links, lang) {
  // Start from the full set so language-specific keys (`zhFaq`, …) stay
  // reachable — the header switcher needs both sides of every pair.
  const out = { ...links };
  for (const key of MIRRORED_KEYS) {
    const target = normalizeLang(lang) === 'zh' ? LANG_TWIN[key] : key;
    out[key] = links[target] ?? links[key];
  }
  // Language-neutral routes pass straight through.
  out.deck = links.deck;
  out.study = links.study;
  out.open = links.open;
  out.admin = links.admin;
  // The switcher needs to resolve the *other* language, so keep the untouched
  // set reachable (non-enumerable: it must never leak into serialization).
  Object.defineProperty(out, '__raw', { value: links, enumerable: false });
  return out;
}

/**
 * Where the header language switcher should point.
 * Mirrored pages swap to their twin; neutral pages keep the current URL and the
 * SPA flips the interface language in place (see `ui/lang.ts`).
 *
 * @param {Record<string, Function>} links
 * @param {string} pageKey route key of the current page, e.g. 'faq'
 * @param {string} lang current language
 */
export function langSwitchHref(links, pageKey, lang) {
  // Always resolve against the untranslated set, otherwise switching away from
  // Chinese would resolve to the Chinese URL again.
  const raw = links.__raw ?? links;
  const next = otherLang(lang);
  const key = pageKey in LANG_TWIN ? pageKey : 'home';
  // Normalise to the English spelling first (`zhFaq` -> `faq`), then flip to the
  // twin only when the *target* is Chinese. Relying on `pageKey` carrying a `zh`
  // prefix is wrong for the SPA, whose page keys are always English (`faq`).
  const baseKey = key.startsWith('zh') ? (LANG_TWIN[key] ?? key) : key;
  const targetKey = next === 'zh' ? (LANG_TWIN[baseKey] ?? 'zhHome') : baseKey;
  const fn = raw[targetKey] ?? raw.home;
  return fn();
}

/** `<html lang>` value for a language. */
export function htmlLang(lang) {
  return LANG_META[normalizeLang(lang)].html;
}

/** og:locale / og:locale:alternate values for a language. */
export function ogLocales(lang) {
  const cur = LANG_META[normalizeLang(lang)].locale;
  const alt = LANG_META[otherLang(lang)].locale;
  return { locale: cur, alternates: [alt] };
}

export function escapeHtml(input) {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttr(input) {
  return escapeHtml(input);
}

/* -------------------------------------------------------------------------- */
/* Minimal Markdown -> HTML (subset: headings, lists, rules, inline)          */
/* -------------------------------------------------------------------------- */

export function renderMarkdown(md) {
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  let html = '';
  let i = 0;
  let listType = null;

  const closeList = () => {
    if (listType) {
      html += `</${listType}>`;
      listType = null;
    }
  };

  while (i < lines.length) {
    const line = lines[i];

    if (/^\s*---\s*$/.test(line)) {
      closeList();
      html += '<hr>';
      i++;
      continue;
    }

    const h = /^(#{1,4})\s+(.*)$/.exec(line);
    if (h) {
      closeList();
      const level = h[1].length;
      html += `<h${level}>${inline(h[2].trim())}</h${level}>`;
      i++;
      continue;
    }

    const ul = /^\s*[-*]\s+(.*)$/.exec(line);
    if (ul) {
      if (listType !== 'ul') {
        closeList();
        html += '<ul>';
        listType = 'ul';
      }
      html += `<li>${inline(ul[1].trim())}</li>`;
      i++;
      continue;
    }

    const ol = /^\s*\d+\.\s+(.*)$/.exec(line);
    if (ol) {
      if (listType !== 'ol') {
        closeList();
        html += '<ol>';
        listType = 'ol';
      }
      html += `<li>${inline(ol[1].trim())}</li>`;
      i++;
      continue;
    }

    const quote = /^\s*>\s?(.*)$/.exec(line);
    if (quote) {
      closeList();
      html += `<blockquote>${inline(quote[1].trim())}</blockquote>`;
      i++;
      continue;
    }

    if (line.trim() === '') {
      closeList();
      i++;
      continue;
    }

    closeList();
    html += `<p>${inline(line.trim())}</p>`;
    i++;
  }
  closeList();
  return html;
}

function inline(text) {
  let out = escapeHtml(text);
  out = out.replace(/`([^`]+)`/g, (_m, c) => `<code>${c}</code>`);
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>');
  out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_m, t, u) => {
    const safe = /^(https?:|mailto:|\/|#)/i.test(u) ? u : '#';
    return `<a href="${escapeAttr(safe)}"${/^https?:/i.test(safe) ? ' target="_blank" rel="noopener"' : ''}>${t}</a>`;
  });
  return out;
}

/* -------------------------------------------------------------------------- */
/* Chrome (header / footer) — used by the prerendered static pages             */
/* -------------------------------------------------------------------------- */

/**
 * Site header. The language switcher is the last item in the navigation, i.e.
 * the right-most control in the bar.
 *
 * @param {object} [opts]
 * @param {Record<string, Function>} [opts.links] already localized link set
 * @param {string} [opts.active] active nav key
 * @param {string} [opts.lang] current language
 * @param {string} [opts.pageKey] route key of this page (used for the switcher)
 */
export function siteHeaderHtml(opts = {}) {
  const links = opts.links ?? seoLinks;
  const a = opts.active ?? '';
  const lang = normalizeLang(opts.lang);
  const pageKey = opts.pageKey ?? 'home';
  // Route key -> i18n key. The share route is labelled "Share a deck".
  const NAV_I18N = { home: 'decks', open: 'open', submit: 'share', faq: 'faq', about: 'about' };
  const nav = (href, key) =>
    `<a class="nav-link${a === key ? ' is-active' : ''}" href="${escapeAttr(href)}">${escapeHtml(
      t(lang, `nav.${NAV_I18N[key] ?? key}`),
    )}</a>`;

  const next = otherLang(lang);
  const href = opts.switchHref ?? langSwitchHref(links, pageKey, lang);
  const switcher = `<a class="lang-switch" data-lang-switch="${escapeAttr(next)}" href="${escapeAttr(
    href,
  )}" hreflang="${escapeAttr(LANG_META[next].html)}" lang="${escapeAttr(
    LANG_META[next].html,
  )}" title="${escapeAttr(t(lang, 'lang.label'))}" aria-label="${escapeAttr(
    t(lang, 'a11y.langSwitch', { lang: t(lang, `lang.name.${next}`) }),
  )}"><span class="lang-switch-globe" aria-hidden="true">&#9673;</span><span class="lang-switch-text">${escapeHtml(
    LANG_META[next].short,
  )}</span></a>`;

  return `
  <header class="site-header">
    <div class="site-header-inner">
      <a class="brand" href="${escapeAttr(links.home())}">
        <span class="brand-mark" aria-hidden="true"></span>
        <span class="brand-name">Anki Browser</span>
      </a>
      <nav class="site-nav" aria-label="${escapeAttr(t(lang, 'nav.main'))}">
        ${nav(links.home(), 'home')}
        ${nav(links.open(), 'open')}
        ${nav(links.submit(), 'submit')}
        ${nav(links.faq(), 'faq')}
        ${nav(links.about(), 'about')}
        ${switcher}
      </nav>
    </div>
  </header>`;
}

/**
 * Site footer: a row of legal/information links above the single centered
 * credit line. No panel, no background — it sits on the page background.
 */
export function siteFooterHtml(opts = {}) {
  const links = opts.links ?? seoLinks;
  const lang = normalizeLang(opts.lang);
  const item = (href, key) => `<a href="${escapeAttr(href)}">${escapeHtml(t(lang, `footer.${key}`))}</a>`;
  const legal = [
    item(links.faq(), 'faq'),
    item(links.privacy(), 'privacy'),
    item(links.terms(), 'terms'),
    item(links.contentPolicy(), 'content'),
    item(links.contact(), 'contact'),
    `<a href="${escapeAttr(REPO_URL)}" target="_blank" rel="noopener">${escapeHtml(
      t(lang, 'footer.source'),
    )}</a>`,
  ].join('\n        ');
  return `
  <footer class="site-footer">
    <nav class="site-footer-links" aria-label="${escapeAttr(t(lang, 'footer.faq'))}">
        ${legal}
    </nav>
    <p class="site-footer-line">Anki Browser &middot; Made by <a href="${escapeAttr(
      OWNER_URL,
    )}" target="_blank" rel="noopener">Endril</a></p>
  </footer>`;
}

/* -------------------------------------------------------------------------- */
/* Home gallery                                                               */
/* -------------------------------------------------------------------------- */

export function deckCoverHtml(deck) {
  if (deck.cover) {
    return `<img class="deck-cover-img" src="${escapeAttr(deck.cover)}" alt="${escapeAttr(deck.title)} cover">`;
  }
  const initial = escapeHtml((deck.title.trim()[0] || '?').toUpperCase());
  return `<div class="deck-cover-gen" data-seed="${escapeAttr(deck.slug)}"><span>${initial}</span></div>`;
}

/**
 * The "share your deck" entry card. Rendered as the last tile of the deck grid
 * so it reads as part of the gallery instead of a banner ad.
 */
export function shareEntryCardHtml(links = seoLinks, lang = 'en') {
  return `
      <a class="deck-card deck-card-share" href="${escapeAttr(links.submit())}">
        <div class="deck-cover-gen deck-cover-share"><span aria-hidden="true">+</span></div>
        <div class="deck-card-body">
          <h3 class="deck-card-title">${escapeHtml(t(lang, 'home.shareCardTitle'))}</h3>
          <p class="deck-card-sub">${escapeHtml(t(lang, 'home.shareCardSub'))}</p>
          <div class="deck-card-cta">${escapeHtml(t(lang, 'home.shareCardCta'))} &rarr;</div>
        </div>
      </a>`;
}

/**
 * Deck gallery.
 *
 * @param {any[]} decks
 * @param {Record<string, Function>} [links]
 * @param {{lang?: string, shareCard?: boolean}} [opts]
 */
export function decksGalleryHtml(decks, links = seoLinks, opts = {}) {
  const lang = normalizeLang(opts.lang);
  if (!decks.length && !opts.shareCard) {
    return `<p class="empty-note">${escapeHtml(t(lang, 'home.empty'))}</p>`;
  }
  const cards = decks
    .map((d) => {
      const href = escapeAttr(links.deck(d.slug));
      const tags = (d.tags ?? [])
        .slice(0, 4)
        .map((t2) => `<span class="tag">${escapeHtml(t2)}</span>`)
        .join('');
      return `
      <a class="deck-card" href="${href}">
        ${deckCoverHtml(d)}
        <div class="deck-card-body">
          <h3 class="deck-card-title">${escapeHtml(d.title)}</h3>
          ${d.subtitle ? `<p class="deck-card-sub">${escapeHtml(d.subtitle)}</p>` : ''}
          ${tags ? `<div class="deck-card-tags">${tags}</div>` : ''}
        </div>
      </a>`;
    })
    .join('');
  const share = opts.shareCard ? shareEntryCardHtml(links, lang) : '';
  return `<div class="deck-grid">${cards}${share}</div>`;
}

/* -------------------------------------------------------------------------- */
/* Deck article (intro + download / study actions)                            */
/* -------------------------------------------------------------------------- */

/** Normalize a deck's download sources: legacy `baiduLink` string -> one entry. */
function deckDownloads(deck) {
  const list = Array.isArray(deck.downloads) ? deck.downloads : [];
  const legacy = typeof deck.baiduLink === 'string' && deck.baiduLink
    ? [{ url: deck.baiduLink, label: '百度网盘' }]
    : [];
  return [...list, ...legacy];
}

function downloadButtonHtml(dl, primary = false, lang = 'en') {
  const label = dl.label
    ? t(lang, 'deck.downloadVia', { label: dl.label })
    : t(lang, 'deck.download');
  const note = dl.note ? `<span class="btn-note">${escapeHtml(dl.note)}</span>` : '';
  return `<span class="btn-group">` +
    `<a class="btn ${primary ? 'btn-primary' : 'btn-secondary'}" href="${escapeAttr(dl.url)}" target="_blank" rel="noopener">${escapeHtml(label)}</a>` +
    `${note}</span>`;
}

/** "by Somebody" with an optional clickable link, or nothing at all. */
function deckAuthorHtml(deck, lang) {
  const author = deck.author;
  if (!author) return '';
  const name = typeof author === 'string' ? author : author.name;
  if (!name) return '';
  const url = typeof author === 'string' ? '' : author.url;
  const inner = url
    ? `<a href="${escapeAttr(url)}" target="_blank" rel="noopener nofollow">${escapeHtml(name)}</a>`
    : escapeHtml(name);
  return `<p class="deck-author">${escapeHtml(lang === 'zh' ? '作者：' : 'by ')}${inner}</p>`;
}

/**
 * Deck article (intro + download / study actions).
 *
 * @param {any} deck
 * @param {string} mdHtml rendered intro copy
 * @param {Record<string, Function>} [links]
 * @param {string} [lang]
 */
export function deckArticleHtml(deck, mdHtml, links = seoLinks, lang = 'en') {
  lang = normalizeLang(lang);
  // Button priority:
  //   - previewFile + downloads : preview is primary, downloads secondary
  //     (let the visitor try it first, then download the full deck)
  //   - only downloads          : first download is primary (they MUST download first),
  //                                "Open local file" is secondary
  //   - only previewFile        : preview is primary, "Open local file" is secondary
  //   - neither                 : "Open local file" primary, disabled download slot
  const hasPreview = !!deck.previewFile;
  const downloads = deckDownloads(deck);
  const actions = [];
  const reviewerBtn = `<a class="btn btn-primary" href="${escapeAttr(
    links.study(deck.slug),
  )}">${escapeHtml(t(lang, 'deck.openInReviewer'))}</a>`;
  const localBtn = `<a class="btn btn-secondary" href="${escapeAttr(links.open())}">${escapeHtml(
    t(lang, 'deck.openLocalFile'),
  )}</a>`;
  if (hasPreview && downloads.length) {
    actions.push(reviewerBtn);
    actions.push(downloads.map((d) => downloadButtonHtml(d, false, lang)).join('\n'));
  } else if (downloads.length) {
    actions.push(downloadButtonHtml(downloads[0], true, lang));
    actions.push(downloads.slice(1).map((d) => downloadButtonHtml(d, false, lang)).join('\n'));
    actions.push(localBtn);
  } else if (hasPreview) {
    actions.push(reviewerBtn);
    actions.push(localBtn);
  } else {
    actions.push(`<a class="btn btn-primary" href="${escapeAttr(links.open())}">${escapeHtml(
      t(lang, 'deck.openLocalFile'),
    )}</a>`);
    actions.push(
      `<span class="btn btn-secondary is-disabled" title="${escapeAttr(
        t(lang, 'deck.downloadPendingTitle'),
      )}">${escapeHtml(t(lang, 'deck.downloadPending'))}</span>`,
    );
  }

  const tags = (deck.tags ?? [])
    .map((t2) => `<span class="tag">${escapeHtml(t2)}</span>`)
    .join('');
  const license = deck.license
    ? `<span class="deck-license">${escapeHtml(deck.license)}</span>`
    : '';
  const metaRow = tags || license ? `<div class="deck-tags">${tags}${license}</div>` : '';

  return `
  <article class="deck-article">
    <a class="back-link" href="${escapeAttr(links.home())}">&larr; ${escapeHtml(
      t(lang, 'deck.backToDecks'),
    )}</a>
    <div class="deck-hero">
      ${deckCoverHtml(deck)}
      <div class="deck-hero-text">
        <h1 class="deck-title">${escapeHtml(deck.title)}</h1>
        ${deck.subtitle ? `<p class="deck-subtitle">${escapeHtml(deck.subtitle)}</p>` : ''}
        ${deckAuthorHtml(deck, lang)}
        ${metaRow}
        ${deck.updated ? `<p class="deck-updated muted">${escapeHtml(t(lang, 'deck.updated', { date: deck.updated }))}</p>` : ''}
      </div>
    </div>
    <div class="deck-actions">${actions.join('\n')}</div>
    <div class="deck-content prose">${mdHtml}</div>
  </article>`;
}

/* -------------------------------------------------------------------------- */
/* Reusable page bodies (shared by the SPA and the SEO prerender)              */
/* -------------------------------------------------------------------------- */

export function heroHtml(links = seoLinks, lang = 'en') {
  lang = normalizeLang(lang);
  return `
  <section class="hero"><div class="container">
    <h1>${escapeHtml(t(lang, 'hero.title'))}</h1>
    <p class="lead">${escapeHtml(t(lang, 'hero.tagline'))}</p>
    <div class="hero-actions">
      <a class="btn btn-primary" href="${escapeAttr(links.open())}">${escapeHtml(t(lang, 'hero.ctaOpen'))}</a>
      <a class="btn btn-secondary" href="${escapeAttr(links.about())}">${escapeHtml(t(lang, 'hero.ctaHow'))}</a>
    </div>
    <p class="hero-note">${escapeHtml(t(lang, 'hero.note'))}</p>
    <p class="hero-tools">${escapeHtml(t(lang, 'hero.tools'))} <a href="${escapeAttr(
      links.apkgViewer(),
    )}">APKG viewer</a> &middot; <a href="${escapeAttr(links.colpkgViewer())}">COLPKG viewer</a> &middot; <a href="${escapeAttr(
      links.submit(),
    )}">${escapeHtml(t(lang, 'nav.share'))}</a></p>
  </div></section>`;
}

/**
 * Generic content-page renderer shared by About, FAQ and the legal pages.
 * Section shape comes from `pages.mjs`; markup lives here.
 *
 * @param {any} content content model from `pages.mjs`
 * @param {{links?: Record<string, Function>, lang?: string, backKey?: string}} [opts]
 */
export function contentPageHtml(content, opts = {}) {
  const links = opts.links ?? seoLinks;
  const lang = normalizeLang(opts.lang);
  const body = (content.sections ?? [])
    .map((s) => {
      const paras = (s.paras ?? []).map((p) => `<p>${p}</p>`).join('');
      const list = s.list?.length ? `<ul>${s.list.map((li) => `<li>${li}</li>`).join('')}</ul>` : '';
      const after = (s.parasAfter ?? []).map((p) => `<p>${p}</p>`).join('');
      return `<h2>${s.h2}</h2>${paras}${list}${after}`;
    })
    .join('\n');
  const faq = (content.faq ?? [])
    .map((f) => `<h3>${escapeHtml(f.q)}</h3><p>${f.a}</p>`)
    .join('\n');
  const back = opts.backKey
    ? `<a class="back-link" href="${escapeAttr(links.home())}">&larr; ${escapeHtml(
        t(lang, 'common.backHome'),
      )}</a>`
    : '';
  const updated = content.updated
    ? `<p class="page-updated muted">${escapeHtml(
        lang === 'zh' ? '最后更新：' : 'Last updated: ',
      )}${escapeHtml(content.updated)}</p>`
    : '';
  const hasSections = (content.sections ?? []).length > 0;
  const faqHeading =
    !hasSections && (content.faq ?? []).length
      ? '' // the page IS the FAQ — a second "FAQ" heading would duplicate the h1
      : `<h2>${escapeHtml(lang === 'zh' ? '常见问题' : 'FAQ')}</h2>`;
  return `
  <div class="content-page">
    ${back}
    <h1>${content.h1}</h1>
    <p class="lead">${content.lead}</p>
    ${updated}
    ${opts.afterLead ?? ''}
    <div class="content-page-body prose">
      ${body}
      ${faq ? `${faqHeading}${faq}` : ''}
    </div>
    ${opts.afterBody ?? ''}
  </div>`;
}

export function aboutBodyHtml(links = seoLinks, lang = 'en') {
  const content = aboutContent(lang);
  const html = contentPageHtml(content, { links, lang, backKey: 'home' });
  return `${html}<p class="content-page-actions"><a class="btn btn-secondary" href="${escapeAttr(
    links.home(),
  )}">${escapeHtml(t(lang, 'about.backToDecks'))}</a></p>`;
}

/** FAQ page: renders the Q&A list directly (it has no separate sections). */
export function faqBodyHtml(links = seoLinks, lang = 'en') {
  return contentPageHtml(faqContent(lang), { links, lang, backKey: 'home' });
}

/** Privacy / Terms / Content policy / Contact. */
export function legalBodyHtml(kind, links = seoLinks, lang = 'en') {
  return contentPageHtml(legalContent(kind, lang), { links, lang, backKey: 'home' });
}

/* -------------------------------------------------------------------------- */
/* Structured data (JSON-LD)                                                  */
/* -------------------------------------------------------------------------- */

export function jsonLdSite(lang = 'en') {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: SITE_TITLE,
    alternateName: 'Anki Browser by Endril',
    url: SITE_URL + '/',
    description: SITE_DESCRIPTION,
    applicationCategory: 'EducationalApplication',
    applicationSubCategory: 'Spaced Repetition / Flashcards',
    operatingSystem: 'Any (browser)',
    browserRequirements: 'Requires WebAssembly + IndexedDB',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    image: SITE_IMAGE,
    inLanguage: normalizeLang(lang),
    isAccessibleForFree: true,
    publisher: { '@type': 'Organization', name: 'Endril', url: OWNER_URL },
    author: { '@type': 'Organization', name: 'Endril', url: OWNER_URL },
    potentialAction: { '@type': 'UseAction', target: SITE_URL + '/' },
  };
}

/**
 * Organization / ContactPoint — the entity that owns the site.
 * Included on legal pages so the publisher is unambiguous to search engines
 * and generative engines (GEO).
 */
export function jsonLdOrganization() {
  const org = {
    '@type': 'Organization',
    '@id': OWNER_URL + '#organization',
    name: 'Endril',
    url: OWNER_URL,
    sameAs: [OWNER_GITHUB, REPO_URL],
  };
  if (CONTACT_EMAIL) {
    org.contactPoint = [
      {
        '@type': 'ContactPoint',
        contactType: 'customer support',
        email: CONTACT_EMAIL,
        url: SITE_URL + '/contact/',
        availableLanguage: ['en', 'zh'],
      },
    ];
  } else {
    org.contactPoint = [
      {
        '@type': 'ContactPoint',
        contactType: 'customer support',
        url: SITE_URL + '/contact/',
        availableLanguage: ['en', 'zh'],
      },
    ];
  }
  return { '@context': 'https://schema.org', ...org };
}

/** BreadcrumbList. `items` is [{name, url}] — the last entry is the current page. */
export function jsonLdBreadcrumb(items) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: it.url,
    })),
  };
}

/** WebPage node, used to tie a page to its publisher and language. */
export function jsonLdWebPage({ name, url, description, lang = 'en', type = 'WebPage' }) {
  return {
    '@context': 'https://schema.org',
    '@type': type,
    name,
    url,
    description,
    inLanguage: normalizeLang(lang),
    isPartOf: { '@type': 'WebSite', name: SITE_TITLE, url: SITE_URL + '/' },
    publisher: { '@id': OWNER_URL + '#organization' },
  };
}

export function jsonLdDeck(deck) {
  const published = deck.updated || new Date().toISOString().slice(0, 10);
  // A community-shared deck carries its own licence and author. Previously every
  // deck was stamped CC BY-NC 4.0, which was simply wrong for submissions and a
  // legal liability for the site.
  const authorName = typeof deck.author === 'string' ? deck.author : deck.author?.name;
  const authorUrl = typeof deck.author === 'string' ? '' : deck.author?.url;
  const creator = authorName
    ? {
        '@type': 'Person',
        name: authorName,
        ...(authorUrl ? { url: authorUrl } : {}),
      }
    : { '@type': 'Organization', name: 'Endril', url: OWNER_URL };
  return {
    '@context': 'https://schema.org',
    '@type': 'LearningResource',
    name: deck.title,
    headline: deck.title,
    description: deck.description || deck.subtitle || '',
    url: `${SITE_URL}/deck/${deck.slug}/`,
    image: deck.cover || SITE_IMAGE,
    inLanguage: deck.language || 'en',
    keywords: (deck.tags ?? []).join(', '),
    learningResourceType: 'Flashcard deck',
    educationalUse: 'self study',
    interactivityType: 'active',
    isAccessibleForFree: true,
    datePublished: published,
    dateModified: published,
    license: licenseUrl(deck.license),
    creator,
    publisher: { '@type': 'Organization', name: 'Endril', url: OWNER_URL },
    provider: { '@type': 'Organization', name: 'Anki Browser', url: SITE_URL + '/' },
  };
}

/**
 * Map a licence label chosen at submission time to its canonical URL.
 * Unknown labels fall back to the site default rather than emitting a
 * licence the deck does not actually carry.
 */
export function licenseUrl(label) {
  const map = {
    'CC BY-NC 4.0': 'https://creativecommons.org/licenses/by-nc/4.0/',
    'CC BY 4.0': 'https://creativecommons.org/licenses/by/4.0/',
    'CC BY-SA 4.0': 'https://creativecommons.org/licenses/by-sa/4.0/',
    'CC0 1.0': 'https://creativecommons.org/publicdomain/zero/1.0/',
    MIT: 'https://opensource.org/licenses/MIT',
  };
  return map[label?.trim()] ?? map['CC BY-NC 4.0'];
}

/* -------------------------------------------------------------------------- */
/* Viewer landing pages (.apkg / .colpkg) + Chinese home                       */
/* Shared by the SPA (hash routes) and the SEO prerender (real paths).         */
/* -------------------------------------------------------------------------- */

/** Full body markup (after <header>) for an .apkg / .colpkg viewer landing page. */
export function viewerBodyHtml({ fmt, lang = 'en', links = seoLinks }) {
  lang = normalizeLang(lang);
  const c = viewerContent(fmt, lang);
  const other = fmt === 'apkg' ? 'colpkg' : 'apkg';
  const otherKey = other === 'apkg' ? 'apkgViewer' : 'colpkgViewer';
  const afterLead = `
    <div class="hero-actions">
      <a class="btn btn-primary" href="${escapeAttr(links.open())}">${escapeHtml(c.ctaLabel)}</a>
      <a class="btn btn-secondary" href="${escapeAttr(links.about())}">${escapeHtml(
        t(lang, 'hero.ctaHow'),
      )}</a>
    </div>
    <p class="hero-note">${escapeHtml(c.note)}</p>
    <p class="hero-tools">${escapeHtml(t(lang, 'hero.tools'))} <a href="${escapeAttr(
      links.apkgViewer(),
    )}">APKG viewer</a> &middot; <a href="${escapeAttr(
      links.colpkgViewer(),
    )}">COLPKG viewer</a> &middot; <a href="${escapeAttr(links.submit())}">${escapeHtml(
      t(lang, 'nav.share'),
    )}</a></p>`;
  const afterBody = `
    <p class="muted" style="margin-top:18px">
      ${escapeHtml(lang === 'zh' ? '想打开另一种格式？' : 'Looking for the other format?')}
      <a href="${escapeAttr(links[otherKey]())}">${other.toUpperCase()} viewer</a>
    </p>`;
  return contentPageHtml(c, { links, lang, backKey: 'home', afterLead, afterBody });
}

/**
 * Home page body — identical for both languages apart from the strings, so the
 * two versions can never fall out of step.
 *
 * @param {{links?: Record<string, Function>, lang?: string, galleryHtml?: string}} [opts]
 */
export function homeBodyHtml(opts = {}) {
  const links = opts.links ?? seoLinks;
  const lang = normalizeLang(opts.lang);
  const gallery = opts.galleryHtml ?? '<div class="spinner"></div>';
  return `
  ${heroHtml(links, lang)}
  <section class="section">
    <div class="container">
      <div class="section-head"><h2>${escapeHtml(t(lang, 'home.sharedDecks'))}</h2></div>
      <div id="gallery">${gallery}</div>
    </div>
  </section>`;
}

/**
 * Static shell for the deck-submission page.
 *
 * The interactive form is mounted by the SPA (`ui/pages/submit.ts`) because it
 * needs the session. This shell keeps the page meaningful for crawlers and for
 * anyone with JavaScript disabled: it explains the flow and offers the sign-in
 * link, which is all the content a search engine needs to index the intent.
 *
 * @param {{links?: Record<string, Function>, lang?: string, signInUrl?: string}} [opts]
 */
export function submitBodyHtml(opts = {}) {
  const links = opts.links ?? seoLinks;
  const lang = normalizeLang(opts.lang);
  const signIn = opts.signInUrl
    ? `<p class="submit-signin"><a class="btn btn-primary" href="${escapeAttr(
        opts.signInUrl,
      )}">${escapeHtml(t(lang, 'submit.signInButton'))}</a></p>`
    : '';
  return contentPageHtml(
    {
      h1: escapeHtml(t(lang, 'submit.title')),
      lead: escapeHtml(t(lang, 'submit.lead')),
      sections: [
        {
          h2: escapeHtml(t(lang, 'submit.howItWorksTitle')),
          list: tl(lang, 'submit.howItWorks').map(escapeHtml),
        },
        {
          h2: escapeHtml(t(lang, 'submit.signInTitle')),
          paras: [escapeHtml(t(lang, 'submit.signInWhy'))],
        },
      ],
    },
    {
      links,
      lang,
      backKey: 'home',
      afterLead: signIn,
      afterBody: `<p class="muted">${escapeHtml(
        lang === 'zh' ? '只想先看看别人分享了什么？' : 'Just want to see what others shared?',
      )} <a href="${escapeAttr(links.home())}">${escapeHtml(t(lang, 'common.backHome'))}</a></p>`,
    },
  );
}

/** FAQPage JSON-LD for viewer landing pages. */
export function jsonLdFaq(faqs) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };
}
