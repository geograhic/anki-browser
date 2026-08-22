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
 */

export const SITE_URL = 'https://apps.endril.com/anki-browser';
export const SITE_TITLE = 'Anki Browser';
export const SITE_TAGLINE = 'Open Anki decks in your browser. Review offline, no account, nothing uploaded.';
export const SITE_DESCRIPTION =
  'Upload an .apkg or .colpkg Anki deck and review it right in your browser. Full spaced-repetition scheduler, media and cloze support, and local-only progress — your data never leaves your device.';

/** Link set; the SPA uses hash routes, the prerender uses canonical paths. */
export const seoLinks = {
  home: () => SITE_URL + '/',
  about: () => SITE_URL + '/about/',
  open: () => SITE_URL + '/#/open',
  deck: (slug) => `${SITE_URL}/deck/${slug}/`,
  study: (slug) => `${SITE_URL}/#/study?deck=${encodeURIComponent(slug)}`,
};

export const appLinks = {
  home: () => '#/',
  about: () => '#/about',
  open: () => '#/open',
  deck: (slug) => `#/deck/${slug}`,
  study: (slug) => `#/study?deck=${encodeURIComponent(slug)}`,
};

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

export function siteHeaderHtml(opts = {}) {
  const links = opts.links ?? seoLinks;
  const a = opts.active ?? '';
  const nav = (href, label, key) =>
    `<a class="nav-link${a === key ? ' is-active' : ''}" href="${escapeAttr(href)}">${escapeHtml(label)}</a>`;
  return `
  <header class="site-header">
    <div class="site-header-inner">
      <a class="brand" href="${escapeAttr(links.home())}">
        <span class="brand-mark" aria-hidden="true"></span>
        <span class="brand-name">Anki Browser</span>
      </a>
      <nav class="site-nav">
        ${nav(links.home(), 'Decks', 'home')}
        ${nav(links.open(), 'Open file', 'open')}
        ${nav(links.about(), 'About', 'about')}
      </nav>
    </div>
  </header>`;
}

export function siteFooterHtml() {
  return `
  <footer class="site-footer">
    <div class="site-footer-inner">
      <p>Anki Browser &middot; everything runs locally in your browser.</p>
      <p class="muted">Made by <a href="https://endril.com" target="_blank" rel="noopener">Endril</a>.</p>
    </div>
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

export function decksGalleryHtml(decks, links = seoLinks) {
  if (!decks.length) {
    return `<p class="empty-note">No decks published yet.</p>`;
  }
  const cards = decks
    .map((d) => {
      const href = escapeAttr(links.deck(d.slug));
      const tags = (d.tags ?? [])
        .slice(0, 4)
        .map((t) => `<span class="tag">${escapeHtml(t)}</span>`)
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
  return `<div class="deck-grid">${cards}</div>`;
}

/* -------------------------------------------------------------------------- */
/* Deck article (intro + download / study actions)                            */
/* -------------------------------------------------------------------------- */

export function deckArticleHtml(deck, mdHtml, links = seoLinks) {
  const actions = [];
  if (deck.previewFile) {
    actions.push(`<a class="btn btn-primary" href="${escapeAttr(links.study(deck.slug))}">Open in reviewer</a>`);
  } else {
    actions.push(`<a class="btn btn-primary" href="${escapeAttr(links.open())}">Open local file</a>`);
  }
  if (deck.baiduLink) {
    actions.push(
      `<a class="btn btn-secondary" href="${escapeAttr(deck.baiduLink)}" target="_blank" rel="noopener">Download via Baidu Netdisk</a>`,
    );
  } else {
    actions.push(
      `<span class="btn btn-secondary is-disabled" title="The owner will add a download link soon">Download link pending</span>`,
    );
  }

  const tags = (deck.tags ?? [])
    .map((t) => `<span class="tag">${escapeHtml(t)}</span>`)
    .join('');

  return `
  <article class="deck-article">
    <a class="back-link" href="${escapeAttr(links.home())}">&larr; All decks</a>
    <div class="deck-hero">
      ${deckCoverHtml(deck)}
      <div class="deck-hero-text">
        <h1 class="deck-title">${escapeHtml(deck.title)}</h1>
        ${deck.subtitle ? `<p class="deck-subtitle">${escapeHtml(deck.subtitle)}</p>` : ''}
        ${tags ? `<div class="deck-tags">${tags}</div>` : ''}
        ${deck.updated ? `<p class="deck-updated muted">Updated ${escapeHtml(deck.updated)}</p>` : ''}
      </div>
    </div>
    <div class="deck-actions">${actions.join('\n')}</div>
    <div class="deck-content prose">${mdHtml}</div>
  </article>`;
}

/* -------------------------------------------------------------------------- */
/* Reusable page bodies (shared by the SPA and the SEO prerender)              */
/* -------------------------------------------------------------------------- */

export function heroHtml(links = seoLinks) {
  return `
  <section class="hero"><div class="container">
    <h1>Review Anki decks, right in your browser</h1>
    <p class="lead">${SITE_TAGLINE}</p>
    <div class="hero-actions">
      <a class="btn btn-primary" href="${escapeAttr(links.open())}">Open a .apkg / .colpkg</a>
      <a class="btn btn-secondary" href="${escapeAttr(links.about())}">How it works</a>
    </div>
    <p class="hero-note">No account. No upload. Your file is parsed on your device and never sent anywhere.</p>
  </div></section>`;
}

export function aboutBodyHtml() {
  return `
  <div class="about-wrap">
    <h1>About Anki Browser</h1>
    <div class="about-card">
      <h2>What it is</h2>
      <p>
        Anki Browser lets you open Anki deck files (<code>.apkg</code> shared decks and
        <code>.colpkg</code> collection backups) and review them directly in your web browser.
        Everything is parsed on your device — your file is never uploaded to a server.
      </p>
      <h2>Privacy</h2>
      <p>
        No account, no cloud, no tracking. Review progress is saved locally in your browser
        (IndexedDB) and stays on this device. If you clear your browser data, your progress for
        a deck is cleared too.
      </p>
      <h2>How reviewing works</h2>
      <p>
        The built-in scheduler is the classic SM-2 spaced-repetition algorithm used by Anki for
        over a decade. Each card offers four ratings — <strong>Again</strong>, <strong>Hard</strong>,
        <strong>Good</strong>, <strong>Easy</strong> — and the next review interval is computed from
        your answer.
      </p>
      <h2>Built by</h2>
      <p>
        This tool is part of the
        <a class="endril-link" href="https://endril.com" target="_blank" rel="noopener">Endril</a>
        project — spatial intelligence, remote sensing, and open learning tooling. Visit
        <a href="https://endril.com" target="_blank" rel="noopener">endril.com</a> to learn more.
      </p>
    </div>
  </div>`;
}

/* -------------------------------------------------------------------------- */
/* Structured data (JSON-LD)                                                  */
/* -------------------------------------------------------------------------- */

export function jsonLdSite() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: SITE_TITLE,
    url: SITE_URL + '/',
    description: SITE_DESCRIPTION,
    applicationCategory: 'EducationalApplication',
    operatingSystem: 'Any (browser)',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    author: { '@type': 'Organization', name: 'Endril', url: 'https://endril.com' },
  };
}

export function jsonLdDeck(deck) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: deck.title,
    description: deck.description || deck.subtitle || '',
    url: `${SITE_URL}/deck/${deck.slug}/`,
    keywords: (deck.tags ?? []).join(', '),
    license: 'https://creativecommons.org/licenses/by-nc/4.0/',
    creator: { '@type': 'Organization', name: 'Endril', url: 'https://endril.com' },
  };
}
