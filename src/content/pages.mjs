/**
 * Bilingual page *content models* for Anki Browser.
 *
 * This module is pure data — no markup. It is consumed by BOTH the browser SPA
 * and the Node SEO prerender, and rendered by the shared builders in
 * `render.mjs`. Separation of concerns:
 *
 *   pages.mjs  →  what a page says        (data, bilingual, one place)
 *   render.mjs →  how a page is marked up (builders, no copy)
 *   i18n.mjs   →  chrome strings          (nav, buttons, form labels)
 *
 * Adding a page means adding an entry here and one builder call — never
 * duplicating prose between the static site and the app.
 */

/** Absolute site URL. Declared locally so this module stays dependency-free. */
export const SITE_URL = 'https://apps.endril.com/anki-browser';

/** Bump whenever any legal/FAQ copy changes; surfaced on the page and in sitemaps. */
export const CONTENT_UPDATED = '2026-09-03';

export const REPO_URL = 'https://github.com/geograhic/anki-browser';
export const SUBMISSIONS_REPO_URL = 'https://github.com/geograhic/anki-browser-submissions';
export const OWNER_NAME = 'Endril';
export const OWNER_URL = 'https://endril.com';
export const OWNER_GITHUB = 'https://github.com/geograhic';

/**
 * Contact email for privacy/takedown matters.
 * Left empty on purpose: fill it in here (e.g. 'privacy@endril.com') and every
 * legal page, the footer and the ContactPoint structured data pick it up at
 * once. While it is empty we simply render the channels that do exist, so the
 * site is never left claiming an inbox nobody reads.
 */
export const CONTACT_EMAIL = '';

export const SUPPORTED_LICENSES = [
  'CC BY-NC 4.0',
  'CC BY 4.0',
  'CC BY-SA 4.0',
  'CC0 1.0',
  'MIT',
  'Other (describe in the note)',
];

/* -------------------------------------------------------------------------- */
/* Viewer landing pages (.apkg / .colpkg)                                      */
/* -------------------------------------------------------------------------- */

/**
 * @param {'apkg'|'colpkg'} fmt
 * @param {'en'|'zh'} lang
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

/* -------------------------------------------------------------------------- */
/* About                                                                       */
/* -------------------------------------------------------------------------- */

/** @param {'en'|'zh'} lang */
export function aboutContent(lang) {
  if (lang === 'zh') {
    return {
      h1: '关于 Anki Browser',
      lead: '一个完全在你浏览器里运行的 Anki 卡组查看器与复习器。',
      sections: [
        {
          h2: '这是什么',
          paras: [
            'Anki Browser 让你直接在网页浏览器里打开 Anki 卡组文件（<code>.apkg</code> 分享卡组和 <code>.colpkg</code> 收藏备份），<strong>浏览卡片</strong>并用<strong>间隔重复</strong>复习它们。你不需要安装 Anki 桌面软件，也不需要注册账号。所有解析都在你的设备上完成——文件永远不会上传到服务器。',
          ],
        },
        {
          h2: '为什么不需要 Anki 软件？',
          paras: [
            'Anki 文件本质上只是一个容器（一个内含 SQLite 数据库的 zip 包）。浏览器借助 WebAssembly 就能直接读取它，所以浏览卡片、显示图片音频、挖空填空、复习调度——整条链路都能在一个普通网页里跑完。下载一个分享卡组，几秒钟就能开始学习。',
          ],
        },
        {
          h2: '隐私',
          paras: [
            '浏览与复习功能<strong>没有账号、没有云端、没有追踪</strong>。复习进度保存在你浏览器的 IndexedDB 里，只留在这台设备上。如果你清除了浏览器数据，对应卡组的进度也会一并清除。',
            '只有在你主动<strong>投稿分享卡组</strong>时，我们才会用到 GitHub 账号（仅用于识别投稿人与发送审核通知）。详见<a href="' + SITE_URL + '/zh/privacy/">隐私政策</a>。',
          ],
        },
        {
          h2: '复习是怎么运作的',
          paras: [
            '内置调度器是 Anki 使用了十多年的经典 SM-2 间隔重复算法。每张卡片提供四个评分——<strong>Again（重来）</strong>、<strong>Hard（困难）</strong>、<strong>Good（一般）</strong>、<strong>Easy（简单）</strong>——下一次复习的间隔由你的选择计算得出。',
          ],
        },
        {
          h2: '除此之外',
          list: [
            '<strong>浏览模式</strong>：自由翻卡，不计入调度、不写入进度',
            '<strong>复习模式</strong>：SM-2 四键评分，进度本地保存',
            '<strong>侧边栏搜索</strong>：在全部卡片字段里全文检索',
            '<strong>媒体支持</strong>：卡组内嵌的图片、音频直接渲染',
          ],
        },
        {
          h2: '谁做的',
          paras: [
            '这个工具是 <a class="endril-link" href="' + OWNER_URL + '" target="_blank" rel="noopener">Endril</a> 项目的一部分——空间智能、遥感与开放学习工具。访问 <a href="' + OWNER_URL + '" target="_blank" rel="noopener">endril.com</a> 了解更多。',
          ],
        },
      ],
    };
  }
  return {
    h1: 'About Anki Browser',
    lead: 'An Anki deck viewer and reviewer that runs entirely inside your browser.',
    sections: [
      {
        h2: 'What it is',
        paras: [
          'Anki Browser lets you open Anki deck files (<code>.apkg</code> shared decks and <code>.colpkg</code> collection backups), <strong>browse the cards</strong>, and <strong>review them with spaced repetition</strong> — all in your web browser. You don\'t need to install the Anki desktop app, and you don\'t need an account. Everything is parsed on your device — your file is never uploaded to a server.',
        ],
      },
      {
        h2: 'Why no Anki software?',
        paras: [
          'Anki files are just a container (a zip with a SQLite database inside). The browser can read them directly with WebAssembly, so the whole experience — browsing cards, seeing images and audio, cloze deletions, the review scheduler — runs in a normal web page. Download a shared deck and start studying in seconds.',
        ],
      },
      {
        h2: 'Privacy',
        paras: [
          'For browsing and reviewing there is <strong>no account, no cloud, and no tracking</strong>. Review progress is saved locally in your browser (IndexedDB) and stays on this device. If you clear your browser data, your progress for a deck is cleared too.',
          'A GitHub account is only involved when you deliberately <strong>submit a deck to share</strong> — it identifies the submitter and lets us tell you the review result. See the <a href="' + SITE_URL + '/privacy/">Privacy Policy</a>.',
        ],
      },
      {
        h2: 'How reviewing works',
        paras: [
          'The built-in scheduler is the classic SM-2 spaced-repetition algorithm used by Anki for over a decade. Each card offers four ratings — <strong>Again</strong>, <strong>Hard</strong>, <strong>Good</strong>, <strong>Easy</strong> — and the next review interval is computed from your answer.',
        ],
      },
      {
        h2: 'Beyond the basics',
        list: [
          '<strong>Browse mode</strong> — flip through cards freely; no scheduling, no progress written',
          '<strong>Review mode</strong> — SM-2 ratings with per-deck progress kept locally',
          '<strong>Sidebar search</strong> — full-text search across every card field',
          '<strong>Media support</strong> — images and audio embedded in the deck render inline',
        ],
      },
      {
        h2: 'Built by',
        paras: [
          'This tool is part of the <a class="endril-link" href="' + OWNER_URL + '" target="_blank" rel="noopener">Endril</a> project — spatial intelligence, remote sensing, and open learning tooling. Visit <a href="' + OWNER_URL + '" target="_blank" rel="noopener">endril.com</a> to learn more.',
        ],
      },
    ],
  };
}

/* -------------------------------------------------------------------------- */
/* FAQ                                                                         */
/* -------------------------------------------------------------------------- */

/** @param {'en'|'zh'} lang */
export function faqContent(lang) {
  if (lang === 'zh') {
    return {
      h1: '常见问题',
      lead: '关于 Anki Browser 的高频问题，一次说清。',
      faq: [
        {
          q: 'Anki Browser 是免费的吗？',
          a: '是，完全免费，也没有隐藏的付费墙或功能限制。它是一个开源项目，代码托管在 GitHub 上。',
        },
        {
          q: '需要安装 Anki 软件吗？',
          a: '不需要。Anki Browser 用 WebAssembly 在浏览器里直接解析 .apkg / .colpkg 文件，整条链路都在网页中完成。',
        },
        {
          q: '支持哪些文件格式？',
          a: '支持两种：.apkg（Anki 导出的分享卡组）和 .colpkg（Anki 桌面版导出的整个收藏库备份）。',
        },
        {
          q: '我的卡组文件会被上传吗？',
          a: '不会。文件在你的设备上用 WebAssembly 本地解压与解析，任何卡片内容都不会离开你的设备。这也是 Anki Browser 与 AnkiWeb 最大的区别。',
        },
        {
          q: '手机和平板上能用吗？',
          a: '可以。Windows、macOS、Linux、iOS、Android 上的任意现代浏览器都能用，且会自适应屏幕尺寸。',
        },
        {
          q: '只能看卡片，还是能真的复习？',
          a: '能真的复习。内置经典 SM-2 间隔重复调度器，提供 Again / Hard / Good / Easy 四个评分按钮，间隔计算方式与 Anki 一致。',
        },
        {
          q: '支持图片、音频和挖空（Cloze）吗？',
          a: '支持。卡组里内嵌的图片与音频会直接渲染，Cloze 挖空笔记也能正常显示与复习。',
        },
        {
          q: '复习进度存在哪里？能跨设备同步吗？',
          a: '进度存在浏览器的 IndexedDB 里，按卡组指纹区分，只留在当前这台设备上。目前不提供跨设备同步——因为一旦同步就必须把数据上传到服务器，那会破坏"文件绝不上传"的承诺。清除浏览器数据会一并清除进度。',
        },
        {
          q: '能把在这里复习的进度导回 Anki 吗？',
          a: '目前不能。Anki Browser 的进度是独立于 Anki 收藏库的本地记录，没有导出回 Anki 的功能。',
        },
        {
          q: '它和 AnkiWeb 有什么不同？',
          a: 'AnkiWeb 需要注册账号并把收藏库上传到 Anki 官方服务器；Anki Browser 不需要账号、不上传任何东西，代价是进度只保存在本地、不能跨设备同步。两者定位不同：AnkiWeb 是同步服务，Anki Browser 是临时查看与复习工具。',
        },
        {
          q: '我自己的卡组能分享到这个网站吗？',
          a: '可以。点击导航栏的"分享卡组"，填写卡组名称、下载链接和一句话简介三项必填内容即可投稿。用 GitHub 登录后提交，审核结果会通过 GitHub 通知你。',
        },
        {
          q: '分享的卡组用什么许可协议？',
          a: '投稿时由你自己选择，默认是 CC BY-NC 4.0（署名-非商业性使用）。你必须是卡组内容的权利人或已获得授权——很多 Anki 卡组包含第三方图片或音频，投稿前请确认你有权分发它们。',
        },
        {
          q: '发现某个卡组侵权了，怎么下架？',
          a: '在内容政策与版权页面按 DMCA 流程提交下架请求，或直接在 GitHub 上开一个 issue 说明情况，我们会尽快处理。',
        },
        {
          q: '它是开源的吗？',
          a: '是。源码在 ' + REPO_URL + '，欢迎提 issue 与 PR。',
        },
      ],
    };
  }
  return {
    h1: 'Frequently asked questions',
    lead: 'Everything people ask about Anki Browser, answered in one place.',
    faq: [
      {
        q: 'Is Anki Browser free?',
        a: 'Yes — completely free, with no paywall and no feature gates. It is an open-source project hosted on GitHub.',
      },
      {
        q: 'Do I need to install Anki?',
        a: 'No. Anki Browser parses .apkg and .colpkg files directly in your browser using WebAssembly, so the whole pipeline runs inside the web page.',
      },
      {
        q: 'Which file formats are supported?',
        a: 'Two: .apkg (a shared deck exported from Anki) and .colpkg (a backup of an entire Anki collection, created with File → Export → Collection in Anki Desktop).',
      },
      {
        q: 'Is my deck file uploaded anywhere?',
        a: 'No. The file is unzipped and parsed locally on your device with WebAssembly; no card content ever leaves it. This is the single biggest difference between Anki Browser and AnkiWeb.',
      },
      {
        q: 'Does it work on phones and tablets?',
        a: 'Yes. Any modern browser on Windows, macOS, Linux, iOS or Android works, and the layout adapts to the screen size.',
      },
      {
        q: 'Can I actually study, or only view cards?',
        a: 'You can genuinely study. The built-in scheduler is the classic SM-2 spaced-repetition algorithm with Again / Hard / Good / Easy buttons, computing intervals the same way Anki does.',
      },
      {
        q: 'Does it support images, audio and cloze deletions?',
        a: 'Yes. Images and audio embedded in the deck render inline, and cloze notes display and review correctly.',
      },
      {
        q: 'Where is my review progress stored? Can I sync across devices?',
        a: 'Progress lives in your browser\'s IndexedDB, keyed per deck, and stays on that one device. There is deliberately no cross-device sync: syncing would require uploading your data to a server, which would break the promise that nothing ever leaves your device. Clearing your browser data clears the progress too.',
      },
      {
        q: 'Can I import my progress back into Anki?',
        a: 'Not at the moment. Anki Browser progress is a local record separate from your Anki collection, and there is no export path back into Anki.',
      },
      {
        q: 'How is this different from AnkiWeb?',
        a: 'AnkiWeb requires an account and uploads your collection to Anki\'s servers. Anki Browser needs no account and uploads nothing; the trade-off is that progress stays local and does not sync between devices. They solve different problems — AnkiWeb is a sync service, Anki Browser is a viewer and reviewer for decks you have right now.',
      },
      {
        q: 'Can I share my own deck on this site?',
        a: 'Yes. Click "Share a deck" in the navigation bar and fill in three required fields: deck name, download link and a one-line summary. Sign in with GitHub to submit, and GitHub will notify you when your deck is reviewed.',
      },
      {
        q: 'Which license applies to shared decks?',
        a: 'You choose when you submit; the default is CC BY-NC 4.0. You must own the deck content or be authorised to distribute it — many Anki decks embed third-party images or audio, so please check your rights before submitting.',
      },
      {
        q: 'A shared deck infringes my rights — how do I get it removed?',
        a: 'Follow the DMCA process described on the Content & DMCA page, or open a GitHub issue describing the problem. We act on valid notices promptly.',
      },
      {
        q: 'Is it open source?',
        a: 'Yes. The source is at ' + REPO_URL + ' — issues and pull requests are welcome.',
      },
    ],
  };
}

/* -------------------------------------------------------------------------- */
/* Legal pages                                                                 */
/* -------------------------------------------------------------------------- */

const EMAIL_LINE = CONTACT_EMAIL ? `<a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a>` : '';

/**
 * @param {'privacy'|'terms'|'content'|'contact'} kind
 * @param {'en'|'zh'} lang
 */
export function legalContent(kind, lang) {
  const table = {
    privacy: { en: privacyEn, zh: privacyZh },
    terms: { en: termsEn, zh: termsZh },
    content: { en: contentEn, zh: contentZh },
    contact: { en: contactEn, zh: contactZh },
  };
  return table[kind][lang]();
}

function privacyEn() {
  return {
    h1: 'Privacy Policy',
    lead:
      'Anki Browser is designed so that the most privacy-sensitive part needs no privacy policy at all: your deck files are parsed on your own device and never uploaded. This page explains the parts that do involve data.',
    updated: CONTENT_UPDATED,
    sections: [
      {
        h2: 'The short version',
        list: [
          'Opening, browsing and reviewing a deck involves <strong>no account, no upload and no tracking</strong>. Your file is parsed locally with WebAssembly.',
          'Review progress is stored in your browser\'s IndexedDB and never leaves your device.',
          'We do not run analytics, advertising or third-party tracking scripts anywhere on this site.',
          'A GitHub account is used <strong>only</strong> if you choose to submit a deck for sharing, and only to identify you and notify you of the review result.',
        ],
      },
      {
        h2: 'What stays on your device',
        paras: [
          'When you open an <code>.apkg</code> or <code>.colpkg</code> file, the archive is unzipped and its SQLite database is read entirely inside your browser tab using WebAssembly. No card content, media file or file name is transmitted to us or to anyone else.',
          'Your review progress — which cards you have seen, their scheduling state and your ratings — is written to IndexedDB, a storage area belonging to this browser on this device. It is never uploaded, and it is removed when you clear your browser data for this site.',
          'Because nothing is stored on a server, we cannot restore your progress for you, and we cannot see it either.',
        ],
      },
      {
        h2: 'What we collect when you only browse',
        paras: [
          'Nothing that identifies you. We do not use analytics, advertising, fingerprinting or third-party trackers.',
          'Our hosting providers — Cloudflare, which fronts the site, and Vercel, which serves the static files — do receive the standard technical data any web request carries, such as IP address, user agent and requested URL, and may retain it in their own logs under their own policies. We do not augment those logs or combine them with anything else.',
          'We set no cookies for visitors who only browse or review decks.',
        ],
      },
      {
        h2: 'What we collect if you submit a deck',
        paras: [
          'Sharing a deck is optional and separate from the reviewer. If you choose to submit one, you sign in with GitHub. We request <strong>read-only access to your basic profile</strong> — we never ask for, and never receive, write access to your repositories.',
        ],
        list: [
          'Your GitHub username, avatar URL and profile URL.',
          'The deck information you type into the form: name, download link, summary, and any optional fields such as cover image URL, tags, author name and author link.',
          'The time of submission and the submission ticket number.',
        ],
        parasAfter: [
          'Your submission is opened as a <strong>public issue</strong> in our submissions repository on GitHub, and you are mentioned in it by username. That means the deck information you enter — including your GitHub username — is publicly visible. Please do not include personal information you would rather not publish.',
          'The only cookie we set is a session cookie after you sign in. It is HttpOnly, Secure, SameSite=Lax, scoped to this site\'s path, and it stores nothing but your session. Signing out removes it.',
          'We do not ask for, and do not want, your email address: review notifications are delivered by GitHub itself, to whatever address your GitHub account already uses.',
        ],
      },
      {
        h2: 'Why we use GitHub for submissions',
        paras: [
          'Running our own account system would mean storing passwords or third-party credentials — a liability for a small site like this. GitHub already solves identity and notification, and by asking for read-only profile access we keep the blast radius of any mistake as small as possible.',
        ],
      },
      {
        h2: 'Your choices',
        list: [
          'Do not submit a deck — browsing and reviewing never requires an account.',
          'Sign out at any time; the session cookie is deleted immediately.',
          'Ask us to close or delete your submission ticket, and to remove your published deck, by opening an issue or using the contact details below.',
          'Clear your browser data to erase all local review progress instantly.',
        ],
      },
      {
        h2: "Children's privacy",
        paras: [
          'Anki Browser is a general-audience study tool and is not directed at children. We do not knowingly collect personal information from children. If you believe a child has submitted a deck, contact us and we will remove the submission.',
        ],
      },
      {
        h2: 'Changes to this policy',
        paras: [
          'If this policy changes materially we will update the date at the top of this page. Continued use of the site after a change means you accept the updated policy.',
        ],
      },
    ],
  };
}

function privacyZh() {
  return {
    h1: '隐私政策',
    lead: 'Anki Browser 的设计理念是：最需要隐私保护的那部分功能，根本不需要隐私政策——你的卡组文件在本地解析，绝不上传。本页说明的是真正涉及数据的那部分。',
    updated: CONTENT_UPDATED,
    sections: [
      {
        h2: '一句话版本',
        list: [
          '打开、浏览和复习卡组<strong>不需要账号、不上传、不追踪</strong>。文件在你的设备上用 WebAssembly 本地解析。',
          '复习进度保存在浏览器的 IndexedDB 里，永远不会离开你的设备。',
          '本站不运行任何分析、广告或第三方追踪脚本。',
          '只有当你主动选择<strong>投稿分享卡组</strong>时，才会用到 GitHub 账号，且仅用于识别你的身份和通知审核结果。',
        ],
      },
      {
        h2: '留在你设备上的数据',
        paras: [
          '当你打开 <code>.apkg</code> 或 <code>.colpkg</code> 文件时，压缩包在你的浏览器标签页内解压，其中的 SQLite 数据库用 WebAssembly 就地读取。任何卡片内容、媒体文件或文件名都不会发送给我们或任何第三方。',
          '你的复习进度——看过哪些卡、调度状态、评分记录——写入的是 IndexedDB，这是属于你这台设备上这个浏览器的存储区。它从不上传，清除本站浏览器数据时会被一并删除。',
          '正因为服务端没有任何存储，我们也无法替你恢复进度，同样也看不到它。',
        ],
      },
      {
        h2: '仅浏览时我们收集什么',
        paras: [
          '不收集任何能识别你身份的信息。我们不使用分析、广告、指纹追踪或第三方追踪器。',
          '我们的托管服务商——前置的 Cloudflare 与提供静态文件的 Vercel——确实会收到任何网络请求都会携带的标准技术数据，例如 IP 地址、User-Agent 和请求的 URL，并可能按各自政策留存日志。我们不会对这些日志做任何增强或关联。',
          '对于只浏览和复习卡组的访客，我们不设置任何 Cookie。',
        ],
      },
      {
        h2: '投稿分享卡组时我们收集什么',
        paras: [
          '分享卡组是可选功能，与复习器相互独立。如果你选择投稿，需要用 GitHub 登录。我们只申请<strong>基本资料的只读权限</strong>——绝不申请、也绝不会获得你仓库的写入权限。',
        ],
        list: [
          '你的 GitHub 用户名、头像链接与主页链接。',
          '你在表单里填写的卡组信息：名称、下载链接、简介，以及封面图片链接、标签、作者名称、作者链接等选填内容。',
          '投稿时间与工单编号。',
        ],
        parasAfter: [
          '你的投稿会以<strong>公开 issue</strong> 的形式开在我们的 GitHub 投稿仓库里，并在正文中 @ 你的用户名。这意味着你填写的卡组信息（含你的 GitHub 用户名）是<strong>公开可见</strong>的。请不要填写你不希望公开的个人信息。',
          '我们设置的唯一 Cookie 是登录后的会话 Cookie：HttpOnly、Secure、SameSite=Lax，作用范围限定在本站路径，且只保存会话本身。退出登录即被删除。',
          '我们不索取、也不想保存你的邮箱地址：审核通知由 GitHub 直接发送到你 GitHub 账号已有的邮箱。',
        ],
      },
      {
        h2: '为什么投稿要用 GitHub',
        paras: [
          '自建账号系统意味着要存储密码或第三方凭证，对这样一个小站来说是负担也是风险。GitHub 已经解决了身份与通知两件事，而只申请资料只读权限，可以把任何意外的影响面压到最小。',
        ],
      },
      {
        h2: '你的选择',
        list: [
          '不投稿——浏览和复习永远不需要账号。',
          '随时退出登录，会话 Cookie 会立即删除。',
          '通过开 issue 或使用下面的联系方式，要求我们关闭/删除你的投稿工单，或下架已发布的卡组。',
          '清除浏览器数据即可立刻抹掉所有本地复习进度。',
        ],
      },
      {
        h2: '儿童隐私',
        paras: [
          'Anki Browser 是面向一般受众的学习工具，并非针对儿童设计。我们不会有意收集儿童的个人信息。如果你认为有儿童提交了卡组，请联系我们，我们会删除该投稿。',
        ],
      },
      {
        h2: '本政策的变更',
        paras: [
          '如果本政策发生实质性变更，我们会更新页面顶部显示的日期。变更之后继续使用本站，即视为你接受更新后的政策。',
        ],
      },
    ],
  };
}

function termsEn() {
  return {
    h1: 'Terms of Service',
    lead: 'The terms for using Anki Browser and for submitting a deck to the shared gallery.',
    updated: CONTENT_UPDATED,
    sections: [
      {
        h2: 'Acceptance',
        paras: [
          'By using Anki Browser you agree to these terms. If you do not agree, please do not use the site. These terms apply to the website at ' + SITE_URL + ' and to the deck gallery it publishes.',
        ],
      },
      {
        h2: 'What the service is',
        paras: [
          'Anki Browser is a free, client-side tool for opening, browsing and reviewing Anki deck files in a web browser. It is provided at no charge and requires no account for that purpose. The shared deck gallery is a directory of links to decks hosted by their authors — we do not host the deck files ourselves.',
        ],
      },
      {
        h2: 'Your files, your responsibility',
        paras: [
          'Files you open are processed only inside your browser. You are responsible for having the right to open and use any file you load, and for the consequences of doing so. Because the files never reach our servers, we have no copy of them and cannot recover them for you.',
        ],
      },
      {
        h2: 'Submitting a deck',
        paras: [
          'Submitting a deck is optional. When you submit one you confirm that:',
        ],
        list: [
          'You own the deck content, or you are authorised to share it and to grant the licence you select.',
          'Your download link points to that deck and does not deliver malware, deceptive advertising or unrelated content.',
          'The information you enter is accurate, and does not contain other people\'s personal data without their consent.',
        ],
        parasAfter: [
          'You grant us a non-exclusive, royalty-free licence to display the metadata you submit and to link to your deck, for as long as the deck is listed. You keep all rights to the deck itself.',
          'We may edit metadata for consistency — fixing capitalisation, trimming tags, resizing or replacing a broken cover image — without changing what the deck is.',
          'We may decline or remove any submission at our discretion, with or without a stated reason.',
        ],
      },
      {
        h2: 'Acceptable use',
        list: [
          'Do not submit links to malicious, deceptive or illegal content.',
          'Do not attempt to disrupt the site, its hosting, or the submission queue.',
          'Do not scrape the gallery for the purpose of republishing it as a competing directory.',
        ],
      },
      {
        h2: 'Disclaimer and limitation of liability',
        paras: [
          'The service is provided <strong>"as is"</strong> and <strong>"as available"</strong>, without warranty of any kind. We do not warrant that it will be uninterrupted, error-free, or that review progress will never be lost — locally stored data can always be cleared by you, by your browser, or by your operating system.',
          'To the maximum extent permitted by law, we are not liable for any indirect, incidental or consequential loss arising from your use of the site, including loss of locally stored review progress or reliance on the content of third-party decks.',
          'Nothing in these terms limits rights that cannot be limited under applicable consumer law.',
        ],
      },
      {
        h2: 'Availability and changes',
        paras: [
          'We may change, suspend or discontinue any part of the service at any time. We may also update these terms; the date at the top of this page shows when they last changed.',
        ],
      },
      {
        h2: 'Governing law',
        paras: [
          'These terms are governed by the laws of the People\'s Republic of China, without regard to conflict-of-law rules. If any provision is held unenforceable, the remaining provisions stay in effect.',
        ],
      },
    ],
  };
}

function termsZh() {
  return {
    h1: '服务条款',
    lead: '使用 Anki Browser 以及向共享卡组库投稿卡组的条款。',
    updated: CONTENT_UPDATED,
    sections: [
      {
        h2: '条款的接受',
        paras: [
          '使用 Anki Browser 即表示你同意本条款。如果你不同意，请不要使用本站。本条款适用于 ' + SITE_URL + ' 及其发布的卡组库。',
        ],
      },
      {
        h2: '服务是什么',
        paras: [
          'Anki Browser 是一个免费的客户端工具，用于在网页浏览器中打开、浏览和复习 Anki 卡组文件。它完全免费，且用于该目的时不需要账号。共享卡组库是一个指向作者自行托管的卡组的链接目录——我们本身不托管任何卡组文件。',
        ],
      },
      {
        h2: '你的文件，你的责任',
        paras: [
          '你打开的文件只在你的浏览器内处理。你需要确保自己有权打开和使用所加载的任何文件，并自行承担相应后果。由于文件从不到达我们的服务器，我们没有任何副本，也无法为你恢复。',
        ],
      },
      {
        h2: '投稿分享卡组',
        paras: ['投稿是可选项。投稿即表示你确认：'],
        list: [
          '你拥有该卡组内容，或已获得分享它并授予所选许可协议的授权。',
          '你的下载链接确实指向该卡组，且不分发恶意软件、欺诈性广告或无关内容。',
          '你填写的信息真实准确，且未在未获同意的情况下包含他人的个人信息。',
        ],
        parasAfter: [
          '你授予我们非独占、免版税的许可，允许我们在该卡组被收录期间展示你提交的元数据并链接到你的卡组。卡组本身的全部权利仍归你所有。',
          '我们可能出于一致性考虑编辑元数据——修正大小写、精简标签、缩放或替换失效的封面图——但不会改变卡组本身的内容。',
          '我们保留自行决定是否拒绝或移除任何投稿的权利，可以说明理由，也可以不说明。',
        ],
      },
      {
        h2: '可接受使用',
        list: [
          '不得提交指向恶意、欺诈或违法内容的链接。',
          '不得试图干扰本站、其托管服务或投稿队列。',
          '不得抓取卡组库并以竞品目录的形式重新发布。',
        ],
      },
      {
        h2: '免责声明与责任限制',
        paras: [
          '本服务按<strong>"现状"</strong>与<strong>"现有可用性"</strong>提供，不作任何形式的担保。我们不保证服务不会中断、不会出错，也不保证复习进度永不丢失——本地存储的数据随时可能被你本人、浏览器或操作系统清除。',
          '在法律允许的最大范围内，我们不对你因使用本站而产生的任何间接、附带或后果性损失承担责任，包括本地复习进度的丢失，或对第三方卡组内容的依赖。',
          '本条款不限制适用消费者法律下不可限制的权利。',
        ],
      },
      {
        h2: '可用性与变更',
        paras: ['我们可随时变更、暂停或终止服务的任何部分，也可更新本条款；页面顶部显示的日期即最近一次变更时间。'],
      },
      {
        h2: '适用法律',
        paras: [
          '本条款受中华人民共和国法律管辖，不适用冲突法规则。若某一条款被认定不可执行，其余条款仍然有效。',
        ],
      },
    ],
  };
}

function contentEn() {
  return {
    h1: 'Content Policy & DMCA',
    lead: 'What may be shared in the Anki Browser deck gallery, how licensing works, and how to have infringing content removed.',
    updated: CONTENT_UPDATED,
    sections: [
      {
        h2: 'What we welcome',
        list: [
          'Decks you made yourself — vocabulary, languages, medicine, law, music, exam prep, anything you genuinely study.',
          'Decks built from material you are licensed to redistribute: your own notes, open-licensed sources, or content you have written permission to share.',
          'Decks with a clear title, a working download link and an honest one-line summary.',
        ],
      },
      {
        h2: 'What we do not accept',
        list: [
          'Decks containing copyrighted text, images or audio you do not have the rights to distribute. This is the most common problem: many Anki decks embed textbook scans, dictionary audio or stock photography. If you did not license those assets, do not submit the deck.',
          'Decks that are dumps of a commercial product — paid courses, coaching material, exam prep sold by someone else.',
          'Decks containing other people\'s personal data, or anything illegal, harassing or malicious.',
          'Links that do not lead to the deck, or that lead to malware, ad walls or unrelated content.',
        ],
      },
      {
        h2: 'Licensing',
        paras: [
          'You choose the licence when you submit. The default is <strong>CC BY-NC 4.0</strong> (attribution, non-commercial), which suits most study decks: others may use and adapt the deck as long as they credit you and do not sell it.',
          'Other options include CC BY 4.0, CC BY-SA 4.0, CC0 1.0 and MIT. If none fits, choose "Other" and describe the terms in the note to the moderator.',
          'The licence you choose applies to the deck content. It does not transfer any rights you do not have — if your deck contains third-party material, your licence cannot cover it and the deck should not be submitted.',
          'Your authorship is displayed on the deck page: your nickname, and a link to your homepage or profile if you provide one.',
        ],
      },
      {
        h2: 'Reporting infringing content',
        paras: [
          'If a listed deck infringes your rights, tell us and we will act. Use any of the channels on the <a href="' + SITE_URL + '/contact/">contact page</a> — a GitHub issue is fastest. Please include:',
        ],
        list: [
          'The URL of the deck page on this site, and the URL of the download link it points to.',
          'Identification of the work you own, and enough detail for us to locate it (title, ISBN, a link to the original).',
          'A statement that you believe in good faith the use is not authorised by you, your agent or the law.',
          'A statement that the information in your notice is accurate and that you are the rights holder or authorised to act on their behalf.',
          'Your name, and a way to reach you (a GitHub account or an email address).',
        ],
        parasAfter: [
          'On a valid notice we remove or disable the listing promptly and tell the submitter what happened. We keep the submission ticket on GitHub as a record of the action taken.',
        ],
      },
      {
        h2: 'Counter-notice',
        paras: [
          'If your deck was removed and you believe this was a mistake — because you own the content, or the use is permitted — reply in the same GitHub issue with the reason, and evidence of your rights. We will review it and may restore the listing.',
        ],
      },
      {
        h2: 'Repeat submissions',
        paras: [
          'Anyone who repeatedly submits infringing or malicious decks is blocked from the submission queue.',
        ],
      },
    ],
  };
}

function contentZh() {
  return {
    h1: '内容政策与版权（DMCA）',
    lead: 'Anki Browser 卡组库允许分享什么内容、许可协议如何运作，以及如何要求移除侵权内容。',
    updated: CONTENT_UPDATED,
    sections: [
      {
        h2: '我们欢迎什么',
        list: [
          '你自己制作的卡组——词汇、语言、医学、法律、音乐、备考，任何你真正在学的内容。',
          '用你有权再分发的材料制作的卡组：你自己的笔记、开放许可来源，或已获得书面授权的内容。',
          '标题清晰、下载链接可用、一句话简介诚实的卡组。',
        ],
      },
      {
        h2: '我们不接受什么',
        list: [
          '包含你没有分发权的受版权保护文字、图片或音频的卡组。这是最常见的问题：很多 Anki 卡组里嵌了教材扫描件、词典音频或图库照片。如果你没有为这些素材取得授权，请不要投稿该卡组。',
          '商业产品的搬运——付费课程、培训机构资料、他人售卖的备考材料。',
          '包含他人个人数据的卡组，以及任何违法、骚扰性或恶意内容。',
          '无法指向该卡组的链接，或指向恶意软件、广告墙、无关内容的链接。',
        ],
      },
      {
        h2: '许可协议',
        paras: [
          '投稿时由你选择许可协议，默认是 <strong>CC BY-NC 4.0</strong>（署名-非商业性使用），它适合大多数学习卡组：他人可以使用和改编，只要署名你且不出售。',
          '其他可选包括 CC BY 4.0、CC BY-SA 4.0、CC0 1.0 与 MIT。如果都不合适，请选择"其他"并在给站长的留言里说明条款。',
          '你选择的许可协议只覆盖卡组内容本身，不会转移你并不拥有的权利——如果你的卡组包含第三方素材，你的许可协议覆盖不了它，该卡组就不应投稿。',
          '你的署名会显示在卡组页面：你的昵称，以及你提供的主页或社交链接（可点击）。',
        ],
      },
      {
        h2: '举报侵权内容',
        paras: [
          '如果某个已收录的卡组侵犯了你的权利，请告诉我们，我们会立即处理。使用<a href="' + SITE_URL + '/contact/">联系页面</a>上的任一渠道——开 GitHub issue 最快。请附上：',
        ],
        list: [
          '本站该卡组页面的 URL，以及它指向的下载链接 URL。',
          '你拥有权利的作品的说明，以及足以让我们定位它的细节（标题、ISBN、原始链接）。',
          '声明你善意认为该使用未经你、你的代理人或法律授权。',
          '声明你通知中的信息准确，且你是权利人或经权利人授权行事。',
          '你的姓名，以及联系方式（GitHub 账号或邮箱）。',
        ],
        parasAfter: ['收到有效通知后，我们会尽快下架或停用该条目，并告知投稿人处理结果。我们会在 GitHub 上保留投稿工单作为处理记录。'],
      },
      {
        h2: '反通知',
        paras: [
          '如果你的卡组被下架，而你认为这是误判——因为你就是内容权利人，或该使用是被允许的——请在同一个 GitHub issue 里说明理由并提供权利证据。我们会复核，并可能恢复该条目。',
        ],
      },
      {
        h2: '重复侵权',
        paras: ['反复投稿侵权或恶意卡组的用户，将被移出投稿队列。'],
      },
    ],
  };
}

function contactEn() {
  return {
    h1: 'Contact',
    lead: 'How to reach the maintainer of Anki Browser.',
    updated: CONTENT_UPDATED,
    sections: [
      {
        h2: 'Bug reports and feature requests',
        paras: [
          'The fastest route is a GitHub issue on the project repository: <a href="' + REPO_URL + '/issues" target="_blank" rel="noopener">' + REPO_URL + '/issues</a>.',
          'If your report involves a specific deck file, please describe the file type (.apkg or .colpkg), the app that produced it, and what you expected to see. Do not attach the deck file itself — we do not need it and we would rather you did not upload it anywhere.',
        ],
      },
      {
        h2: 'Deck submissions and review status',
        paras: [
          'Submit a deck from the <a href="' + SITE_URL + '/submit/">share page</a>. Every submission becomes a public ticket at <a href="' + SUBMISSIONS_REPO_URL + '" target="_blank" rel="noopener">' + SUBMISSIONS_REPO_URL + '</a>, and GitHub emails you on every update — that is where your review status lives.',
        ],
      },
      {
        h2: 'Takedown and privacy requests',
        paras: [
          'Use any channel below. For copyright removal, please include the details listed on the <a href="' + SITE_URL + '/content-policy/">Content & DMCA</a> page so we can act on the first pass.',
        ],
      },
      {
        h2: 'Channels',
        list: contactChannels('en'),
      },
      {
        h2: 'What we cannot help with',
        list: [
          'Recovering review progress — it only ever existed in your own browser, and clearing site data removes it permanently.',
          'Importing Anki Browser progress back into Anki — there is no export path today.',
          'Hosting your deck file — the gallery links to your own download link; we do not store deck files.',
        ],
      },
    ],
  };
}

function contactZh() {
  return {
    h1: '联系',
    lead: '如何联系 Anki Browser 的维护者。',
    updated: CONTENT_UPDATED,
    sections: [
      {
        h2: '问题反馈与功能建议',
        paras: [
          '最快的方式是在项目仓库开 GitHub issue：<a href="' + REPO_URL + '/issues" target="_blank" rel="noopener">' + REPO_URL + '/issues</a>。',
          '如果问题与某个具体的卡组文件有关，请说明文件类型（.apkg 还是 .colpkg）、由哪个软件导出，以及你原本期望看到什么。<strong>请不要附上卡组文件本身</strong>——我们不需要它，也不希望它被上传到任何地方。',
        ],
      },
      {
        h2: '卡组投稿与审核进度',
        paras: [
          '请到<a href="' + SITE_URL + '/zh/submit/">分享页面</a>投稿。每条投稿都会在 <a href="' + SUBMISSIONS_REPO_URL + '" target="_blank" rel="noopener">' + SUBMISSIONS_REPO_URL + '</a> 生成一张公开工单，GitHub 会在每次更新时给你发邮件——审核状态就在那里。',
        ],
      },
      {
        h2: '下架与隐私请求',
        paras: [
          '请使用下列任一渠道。涉及版权下架的，请附上<a href="' + SITE_URL + '/zh/content-policy/">内容与版权</a>页面列出的信息，以便我们一次处理到位。',
        ],
      },
      {
        h2: '联系方式',
        list: contactChannels('zh'),
      },
      {
        h2: '我们帮不上忙的事',
        list: [
          '恢复复习进度——它只存在于你自己的浏览器里，清除站点数据会永久删除。',
          '把 Anki Browser 的进度导回 Anki——目前没有这条导出路径。',
          '托管你的卡组文件——卡组库只链接到你自己的下载地址，我们不存储卡组文件。',
        ],
      },
    ],
  };
}

function contactChannels(lang) {
  const channels = [
    lang === 'zh'
      ? '<strong>GitHub issue（推荐）</strong>——<a href="' + REPO_URL + '/issues" target="_blank" rel="noopener">' + REPO_URL + '/issues</a>，公开透明，最不容易漏。'
      : '<strong>GitHub issues (preferred)</strong> — <a href="' + REPO_URL + '/issues" target="_blank" rel="noopener">' + REPO_URL + '/issues</a>. Public, so nothing gets lost.',
    lang === 'zh'
      ? '<strong>GitHub 主页</strong>——<a href="' + OWNER_GITHUB + '" target="_blank" rel="noopener">' + OWNER_GITHUB + '</a>。'
      : '<strong>GitHub profile</strong> — <a href="' + OWNER_GITHUB + '" target="_blank" rel="noopener">' + OWNER_GITHUB + '</a>.',
    lang === 'zh'
      ? '<strong>站点首页</strong>——<a href="' + OWNER_URL + '" target="_blank" rel="noopener">' + OWNER_URL + '</a>（Endril）。'
      : '<strong>Main site</strong> — <a href="' + OWNER_URL + '" target="_blank" rel="noopener">' + OWNER_URL + '</a> (Endril).',
  ];
  if (CONTACT_EMAIL) {
    channels.unshift(
      lang === 'zh'
        ? '<strong>邮件</strong>——' + EMAIL_LINE + '（下架与隐私请求优先）。'
        : '<strong>Email</strong> — ' + EMAIL_LINE + ' (preferred for takedown and privacy requests).',
    );
  }
  return channels;
}
