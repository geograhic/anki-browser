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

/** Link set; the SPA uses hash routes, the prerender uses canonical paths. */
export const seoLinks = {
  home: () => SITE_URL + '/',
  about: () => SITE_URL + '/about/',
  open: () => SITE_URL + '/#/open',
  deck: (slug) => `${SITE_URL}/deck/${slug}/`,
  study: (slug) => `${SITE_URL}/#/study?deck=${encodeURIComponent(slug)}`,
  apkgViewer: () => SITE_URL + '/apkg-viewer/',
  colpkgViewer: () => SITE_URL + '/colpkg-viewer/',
  zhHome: () => SITE_URL + '/zh/',
  zhApkg: () => SITE_URL + '/zh/apkg-viewer/',
  zhColpkg: () => SITE_URL + '/zh/colpkg-viewer/',
};

export const appLinks = {
  home: () => '#/',
  about: () => '#/about',
  open: () => '#/open',
  deck: (slug) => `#/deck/${slug}`,
  study: (slug) => `#/study?deck=${encodeURIComponent(slug)}`,
  apkgViewer: () => '#/apkg-viewer',
  colpkgViewer: () => '#/colpkg-viewer',
  zhHome: () => '#/zh',
  zhApkg: () => '#/zh/apkg-viewer',
  zhColpkg: () => '#/zh/colpkg-viewer',
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
  // Single centered line, no white panel — sits at the bottom of the page
  // against the page background, exactly per the wireframe.
  return `
  <footer class="site-footer">
    <p class="site-footer-line">Anki Browser &middot; Made by <a href="https://endril.com" target="_blank" rel="noopener">Endril</a></p>
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

/** Normalize a deck's download sources: legacy `baiduLink` string -> one entry. */
function deckDownloads(deck) {
  const list = Array.isArray(deck.downloads) ? deck.downloads : [];
  const legacy = typeof deck.baiduLink === 'string' && deck.baiduLink
    ? [{ url: deck.baiduLink, label: '百度网盘' }]
    : [];
  return [...list, ...legacy];
}

function downloadButtonHtml(dl, primary = false) {
  const label = dl.label ? `Download via ${dl.label}` : 'Download';
  const note = dl.note ? `<span class="btn-note">${escapeHtml(dl.note)}</span>` : '';
  return `<span class="btn-group">` +
    `<a class="btn ${primary ? 'btn-primary' : 'btn-secondary'}" href="${escapeAttr(dl.url)}" target="_blank" rel="noopener">${escapeHtml(label)}</a>` +
    `${note}</span>`;
}

export function deckArticleHtml(deck, mdHtml, links = seoLinks) {
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
  if (hasPreview && downloads.length) {
    actions.push(`<a class="btn btn-primary" href="${escapeAttr(links.study(deck.slug))}">Open in reviewer</a>`);
    actions.push(downloads.map(downloadButtonHtml).join('\n'));
  } else if (downloads.length) {
    actions.push(downloadButtonHtml(downloads[0], true));
    actions.push(downloads.slice(1).map((d) => downloadButtonHtml(d)).join('\n'));
    actions.push(`<a class="btn btn-secondary" href="${escapeAttr(links.open())}">Open local file</a>`);
  } else if (hasPreview) {
    actions.push(`<a class="btn btn-primary" href="${escapeAttr(links.study(deck.slug))}">Open in reviewer</a>`);
    actions.push(`<a class="btn btn-secondary" href="${escapeAttr(links.open())}">Open local file</a>`);
  } else {
    actions.push(`<a class="btn btn-primary" href="${escapeAttr(links.open())}">Open local file</a>`);
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
    <h1>Open, browse &amp; review .apkg / .colpkg decks in your browser</h1>
    <p class="lead">${SITE_TAGLINE}</p>
    <div class="hero-actions">
      <a class="btn btn-primary" href="${escapeAttr(links.open())}">Open a .apkg / .colpkg</a>
      <a class="btn btn-secondary" href="${escapeAttr(links.about())}">How it works</a>
    </div>
    <p class="hero-note">No Anki software. No registration. No upload — your file is parsed on your device and never sent anywhere.</p>
    <p class="hero-tools">Tools: <a href="${escapeAttr(links.apkgViewer())}">APKG viewer</a> &middot; <a href="${escapeAttr(links.colpkgViewer())}">COLPKG viewer</a> &middot; <a href="${escapeAttr(links.zhHome())}" hreflang="zh">中文</a></p>
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
        <code>.colpkg</code> collection backups), <strong>browse the cards</strong>, and
        <strong>review them with spaced repetition</strong> — all in your web browser.
        You don't need to install the Anki desktop app, and you don't need an account.
        Everything is parsed on your device — your file is never uploaded to a server.
      </p>
      <h2>Why no Anki software?</h2>
      <p>
        Anki files are just a container (a zip with a SQLite database inside). The browser
        can read them directly with WebAssembly, so the whole experience — browsing cards,
        seeing images and audio, cloze deletions, the review scheduler — runs in a normal
        web page. Download a shared deck and start studying in seconds.
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
    alternateName: 'Anki Browser by Endril',
    url: SITE_URL + '/',
    description: SITE_DESCRIPTION,
    applicationCategory: 'EducationalApplication',
    applicationSubCategory: 'Spaced Repetition / Flashcards',
    operatingSystem: 'Any (browser)',
    browserRequirements: 'Requires WebAssembly + IndexedDB',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    image: SITE_IMAGE,
    inLanguage: 'en',
    isAccessibleForFree: true,
    publisher: { '@type': 'Organization', name: 'Endril', url: 'https://endril.com' },
    author: { '@type': 'Organization', name: 'Endril', url: 'https://endril.com' },
    potentialAction: { '@type': 'UseAction', target: SITE_URL + '/' },
  };
}

export function jsonLdDeck(deck) {
  const published = deck.updated || new Date().toISOString().slice(0, 10);
  return {
    '@context': 'https://schema.org',
    '@type': 'LearningResource',
    name: deck.title,
    headline: deck.title,
    description: deck.description || deck.subtitle || '',
    url: `${SITE_URL}/deck/${deck.slug}/`,
    image: SITE_IMAGE,
    inLanguage: deck.language || 'en',
    keywords: (deck.tags ?? []).join(', '),
    learningResourceType: 'Flashcard deck',
    educationalUse: 'self study',
    interactivityType: 'active',
    isAccessibleForFree: true,
    datePublished: published,
    dateModified: published,
    license: 'https://creativecommons.org/licenses/by-nc/4.0/',
    creator: { '@type': 'Organization', name: 'Endril', url: 'https://endril.com' },
    publisher: { '@type': 'Organization', name: 'Endril', url: 'https://endril.com' },
    provider: { '@type': 'Organization', name: 'Anki Browser', url: SITE_URL + '/' },
  };
}

/* -------------------------------------------------------------------------- */
/* Viewer landing pages (.apkg / .colpkg) + Chinese home                       */
/* Shared by the SPA (hash routes) and the SEO prerender (real paths).         */
/* -------------------------------------------------------------------------- */

/**
 * Content model for a viewer landing page.
 * @param {string} fmt 'apkg' | 'colpkg'
 * @param {string} lang 'en' | 'zh'
 */
export function viewerContent(fmt, lang) {
  const ext = '.' + fmt;
  const upper = fmt.toUpperCase();
  if (lang === 'zh') {
    const isApkg = fmt === 'apkg';
    return {
      h1: isApkg ? 'APKG 查看器 — 在线打开 .apkg 卡组，无需安装 Anki' : 'COLPKG 查看器 — 在线打开 .colpkg 卡组，无需安装 Anki',
      lead: isApkg
        ? '.apkg 是 Anki 分享卡组的标准格式。直接在浏览器里打开、浏览和复习，无需安装 Anki、无需注册，文件绝不上传。'
        : '.colpkg 是 Anki 整个收藏库（全部卡组 + 笔记 + 媒体）的备份文件。直接在浏览器里打开、浏览和复习，无需安装 Anki。',
      ctaLabel: isApkg ? '打开 .apkg 文件' : '打开 .colpkg 文件',
      note: '你的文件只在本设备上解析，永远不会被上传。',
      sections: [
        {
          h2: isApkg ? '什么是 .apkg 文件？' : '什么是 .colpkg 文件？',
          paras: [
            isApkg
              ? '.apkg 是 Anki（全球数百万学习者使用的免费记忆卡片软件）导出的分享卡组格式。它本质是一个 zip 压缩包：内含一个 SQLite 数据库（所有笔记与卡片），以及卡片用到的图片、音频等媒体文件。'
              : '.colpkg 是 Anki 桌面版导出的收藏备份（文件 → 导出 → 集合）。它把整个收藏库——所有卡组、笔记、卡片与媒体——打包成一个文件，同样是一个内含 SQLite 数据库的 zip 压缩包。',
          ],
        },
        {
          h2: '为什么在浏览器里打开？',
          list: [
            '无需安装 Anki 软件，任何有浏览器的设备都能用',
            '无需注册、无需账号',
            '文件在本地解析，绝不上传到任何服务器',
            '复习进度保存在浏览器本地（IndexedDB）',
          ],
        },
        {
          h2: isApkg ? 'APKG 查看器能做什么？' : 'COLPKG 查看器能做什么？',
          list: isApkg
            ? [
                '浏览卡组里的每一张卡片',
                '显示卡片中的图片、音频，支持挖空（Cloze）',
                '用内置的 SM-2 间隔重复调度器真实复习（Again / Hard / Good / Easy）',
                '按卡组指纹在本地保存复习进度',
              ]
            : [
                '浏览收藏库里的全部卡组，可逐个复习',
                '显示卡片中的图片、音频，支持挖空（Cloze）',
                '用内置的 SM-2 间隔重复调度器真实复习',
                '按卡组指纹在本地保存复习进度',
              ],
        },
        {
          h2: isApkg ? '.apkg 和 .colpkg 有什么区别？' : '.colpkg 和 .apkg 有什么区别？',
          paras: [
            isApkg
              ? '.colpkg 是整个 Anki 收藏库的备份，.apkg 是单个分享卡组。两者都能在 Anki Browser 里打开——如果你要打开的是收藏备份，请看 ' +
                '<a href="' + SITE_URL + '/zh/colpkg-viewer/">COLPKG 查看器</a>。'
              : '.apkg 是单个分享卡组，.colpkg 是整个收藏库的备份。两者都能在 Anki Browser 里打开——如果你要打开的是分享卡组，请看 ' +
                '<a href="' + SITE_URL + '/zh/apkg-viewer/">APKG 查看器</a>。',
          ],
        },
      ],
      faq: [
        { q: ext + ' 文件会被上传到服务器吗？', a: '不会。文件完全在你的设备上用 WebAssembly 解析，不会上传到任何服务器，也不会离开你的设备。' },
        { q: '需要安装 Anki 才能使用这个查看器吗？', a: '不需要。一切都在你的浏览器里运行。' },
        { q: '手机和平板上能用吗？', a: '可以。Windows、macOS、Linux、iOS、Android 上任意现代浏览器都可以。' },
        { q: '只能看卡片，还是能真的复习？', a: '能复习。内置经典 SM-2 间隔重复调度器，四个评分按钮（Again / Hard / Good / Easy）与 Anki 完全一致。' },
        { q: '支持图片、音频和挖空（Cloze）吗？', a: '支持。卡组内的媒体文件会直接渲染，挖空笔记也能正常显示。' },
      ],
    };
  }
  // English
  const isApkg = fmt === 'apkg';
  return {
    h1: `${upper} Viewer — open ${ext} files online, no Anki needed`,
    lead: isApkg
      ? `An ${ext} file is an Anki flashcard deck. Open it in your browser and start reviewing in seconds — no Anki install, no account, no upload.`
      : `A ${ext} file is a full backup of an Anki collection — every deck, note and media file. Browse and review it right in your browser, no Anki install needed.`,
    ctaLabel: isApkg ? 'Open an .apkg file' : 'Open a .colpkg file',
    note: 'Your file is parsed on your device and never uploaded.',
    sections: [
      {
        h2: isApkg ? 'What is an .apkg file?' : 'What is a .colpkg file?',
        paras: [
          isApkg
            ? 'An .apkg file is the standard shared-deck format exported by Anki, the free flashcard app used by millions of learners. It is a zip archive containing a SQLite database of your notes and cards, plus any images, audio and video used by the cards.'
            : 'A .colpkg file is the collection-backup format created by Anki Desktop (File → Export → Collection). It packages your entire collection — every deck, note, card and media file — into a single file, also a zip archive with a SQLite database inside.',
        ],
      },
      {
        h2: 'Why open ' + ext + ' in your browser?',
        list: [
          'No Anki software to install',
          'Works on any device with a modern browser',
          'No account, no registration',
          'Files are parsed locally — never uploaded',
          'Progress saved locally (IndexedDB)',
        ],
      },
      {
        h2: isApkg ? 'What can the ' + upper + ' viewer do?' : 'What can the ' + upper + ' viewer do?',
        list: isApkg
          ? [
              'Browse every card in the deck',
              'Render images, audio and cloze deletions',
              'Review with a full SM-2 spaced-repetition scheduler (Again / Hard / Good / Easy)',
              'Track progress locally, per deck',
            ]
          : [
              'Browse and review every deck inside the collection',
              'Render images, audio and cloze deletions',
              'Review with a full SM-2 spaced-repetition scheduler',
              'Track progress locally, per deck',
            ],
      },
      {
        h2: isApkg ? 'Is .apkg the same as .colpkg?' : 'Is .colpkg the same as .apkg?',
        paras: [
          isApkg
            ? 'No. A .colpkg is a backup of an entire Anki collection; an .apkg is a single shared deck. Both open in Anki Browser — see the <a href="' + SITE_URL + '/colpkg-viewer/">COLPKG viewer</a>.'
            : 'No. An .apkg is a single shared deck; a .colpkg is a backup of an entire collection. Both open in Anki Browser — see the <a href="' + SITE_URL + '/apkg-viewer/">APKG viewer</a>.',
        ],
      },
    ],
    faq: [
      { q: 'Is my ' + ext + ' file uploaded to a server?', a: 'No. The file is opened and parsed entirely on your device using WebAssembly. Nothing is ever sent over the network.' },
      { q: 'Do I need to install Anki to use this viewer?', a: 'No. Everything runs in your web browser — no installation required.' },
      { q: 'Does it work on my phone or tablet?', a: 'Yes — any modern browser on Windows, macOS, Linux, iOS or Android.' },
      { q: 'Can I actually study the deck, not just view it?', a: 'Yes. Anki Browser includes the classic SM-2 scheduler with Again / Hard / Good / Easy buttons, exactly like Anki.' },
      { q: 'Does it support images, audio and cloze deletions?', a: 'Yes. Media files stored in the deck render inline, and cloze notes are supported.' },
    ],
  };
}

/** Full body markup (after <header>) for an .apkg / .colpkg viewer landing page. */
export function viewerBodyHtml({ fmt, lang = 'en', links = seoLinks }) {
  const c = viewerContent(fmt, lang);
  const ext = '.' + fmt;
  const other = fmt === 'apkg' ? 'colpkg' : 'apkg';
  const sections = c.sections
    .map(
      (s) =>
        `<h2>${s.h2}</h2>` +
        (s.paras ? s.paras.map((p) => `<p>${p}</p>`).join('') : '') +
        (s.list ? `<ul>${s.list.map((li) => `<li>${li}</li>`).join('')}</ul>` : ''),
    )
    .join('');
  const faq = c.faq.map((f) => `<h3>${f.q}</h3><p>${f.a}</p>`).join('');
  const toolsRow =
    lang === 'zh'
      ? `Tools: <a href="${escapeAttr(links.apkgViewer())}">APKG viewer</a> &middot; <a href="${escapeAttr(links.colpkgViewer())}">COLPKG viewer</a> &middot; <a href="${escapeAttr(links.home())}" hreflang="en">English</a>`
      : `Tools: <a href="${escapeAttr(links.apkgViewer())}">APKG viewer</a> &middot; <a href="${escapeAttr(links.colpkgViewer())}">COLPKG viewer</a> &middot; <a href="${escapeAttr(links.zhHome())}" hreflang="zh">中文</a>`;
  return `
  <div class="about-wrap">
    <a class="back-link" href="${escapeAttr(links.home())}">&larr; All decks</a>
    <h1>${c.h1}</h1>
    <p class="lead">${c.lead}</p>
    <div class="hero-actions">
      <a class="btn btn-primary" href="${escapeAttr(links.open())}">${c.ctaLabel}</a>
      <a class="btn btn-secondary" href="${escapeAttr(links.about())}">${lang === 'zh' ? '如何运作' : 'How it works'}</a>
    </div>
    <p class="hero-note">${c.note}</p>
    <p class="hero-tools">${toolsRow}</p>
    <div class="about-card">
      ${sections}
      <h2>${lang === 'zh' ? '常见问题' : 'FAQ'}</h2>
      ${faq}
      <p class="muted" style="margin-top:18px">
        ${lang === 'zh' ? '想打开另一种格式？' : 'Looking for the other format?'}
        <a href="${escapeAttr(links[other === 'apkg' ? 'apkgViewer' : 'colpkgViewer']())}">${other.toUpperCase()} viewer</a>
      </p>
    </div>
  </div>`;
}

/** Chinese home landing page body (after <header>). */
export function zhHomeBodyHtml(links = seoLinks) {
  return `
  <section class="hero"><div class="container">
    <h1>在线打开并复习 .apkg / .colpkg Anki 卡组</h1>
    <p class="lead">无需安装 Anki、无需注册——直接在浏览器里浏览和复习 Anki 卡组。文件只在你的设备上解析，绝不上传。</p>
    <div class="hero-actions">
      <a class="btn btn-primary" href="${escapeAttr(links.open())}">打开 .apkg / .colpkg 文件</a>
      <a class="btn btn-secondary" href="${escapeAttr(links.about())}">如何运作</a>
    </div>
    <p class="hero-note">无需 Anki 软件 · 无需注册 · 不上传——你的文件在本地解析，永远不会离开设备。</p>
    <p class="hero-tools">Tools: <a href="${escapeAttr(links.apkgViewer())}">APKG viewer</a> &middot; <a href="${escapeAttr(links.colpkgViewer())}">COLPKG viewer</a> &middot; <a href="${escapeAttr(links.home())}" hreflang="en">English</a></p>
  </div></section>
  <section class="section"><div class="container"><div class="section-head"><h2>查看器工具</h2></div>
    <div class="deck-grid">
      <a class="deck-card" href="${escapeAttr(links.apkgViewer())}">
        <div class="deck-cover-gen" data-seed="apkg"><span>A</span></div>
        <div class="deck-card-body">
          <h3 class="deck-card-title">APKG 查看器</h3>
          <p class="deck-card-sub">在线打开 .apkg 分享卡组，无需安装 Anki</p>
        </div>
      </a>
      <a class="deck-card" href="${escapeAttr(links.colpkgViewer())}">
        <div class="deck-cover-gen" data-seed="colpkg"><span>C</span></div>
        <div class="deck-card-body">
          <h3 class="deck-card-title">COLPKG 查看器</h3>
          <p class="deck-card-sub">在线打开 .colpkg 收藏备份，无需安装 Anki</p>
        </div>
      </a>
    </div>
  </div></section>`;
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
