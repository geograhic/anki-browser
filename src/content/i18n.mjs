/**
 * Bilingual UI strings for Anki Browser — the single source of truth.
 *
 * WHY PLAIN JS: this module is imported by BOTH the browser SPA (TypeScript,
 * via `i18n.d.mts`) and the Node SEO prerender script. Keeping it free of type
 * syntax lets one file serve both consumers, so the crawlable static pages and
 * the live app can never drift apart.
 *
 * PARITY RULE: `zh` must define exactly the same keys as `en`. The build runs
 * `scripts/check-i18n.mjs`, which fails loudly on any missing or extra key —
 * that is what makes "the two language versions stay in sync" a mechanical
 * guarantee rather than a promise.
 */

export const LANGS = /** @type {const} */ (['en', 'zh']);
export const DEFAULT_LANG = 'en';

/** How each language names itself (used for <html lang> / og:locale / hreflang). */
export const LANG_META = {
  en: { html: 'en', locale: 'en_US', label: 'English', short: 'EN', dir: 'ltr' },
  zh: { html: 'zh-CN', locale: 'zh_CN', label: '中文', short: '中文', dir: 'ltr' },
};

/**
 * Labels for the header switcher: the button always offers the *other*
 * language, so `switchTo` is the target language's own name.
 */
export const LANG_SWITCH_LABEL = { en: 'English', zh: '中文' };

const en = {
  common: {
    backHome: 'All decks',
    back: 'Back',
    loading: 'Loading…',
    required: 'Required',
    optional: 'optional',
    error: 'Something went wrong.',
    retry: 'Try again',
    cancel: 'Cancel',
    close: 'Close',
    copy: 'Copy',
    copied: 'Copied',
    save: 'Save',
    moreOptions: 'More options (optional)',
    yes: 'Yes',
    no: 'No',
    neverMind: 'Never mind',
    learnMore: 'Learn more',
  },
  nav: {
    main: 'Main navigation',
    decks: 'Decks',
    open: 'Open file',
    about: 'About',
    faq: 'FAQ',
    share: 'Share a deck',
    admin: 'Admin',
    skipToContent: 'Skip to content',
  },
  lang: {
    label: 'Language',
    switchTo: 'English',
    // Name of each language, written in the language currently displayed.
    name: { en: 'English', zh: 'Chinese' },
  },
  hero: {
    title: 'Open, browse & review .apkg / .colpkg decks in your browser',
    tagline:
      'Open, browse and review Anki decks right in your browser — no Anki software to install, no account, and your files never leave your device.',
    ctaOpen: 'Open a .apkg / .colpkg',
    ctaHow: 'How it works',
    note: 'No Anki software. No registration. No upload — your file is parsed on your device and never sent anywhere.',
    tools: 'Tools:',
  },
  home: {
    sharedDecks: 'Shared decks',
    loadError: 'Could not load the deck list.',
    empty: 'No decks published yet.',
    shareCardTitle: 'Share your deck',
    shareCardSub: 'Publish your .apkg / .colpkg so other learners can browse and review it',
    shareCardCta: 'Submit a deck',
  },
  deck: {
    openInReviewer: 'Open in reviewer',
    openLocalFile: 'Open local file',
    downloadVia: 'Download via {label}',
    download: 'Download',
    downloadPending: 'Download link pending',
    downloadPendingTitle: 'The owner will add a download link soon',
    updated: 'Updated {date}',
    backToDecks: 'All decks',
    noIntro: 'This deck has no intro text yet.',
  },
  about: {
    backToDecks: 'Back to decks',
  },
  footer: {
    madeBy: 'Anki Browser · Made by Endril',
    privacy: 'Privacy',
    terms: 'Terms',
    content: 'Content & DMCA',
    contact: 'Contact',
    faq: 'FAQ',
    source: 'Source',
  },
  faq: {
    backToDecks: 'All decks',
  },
  open: {
    title: 'Open an Anki deck',
    lead: 'Choose an .apkg (shared deck) or .colpkg (full collection backup). Parsing happens entirely on your device.',
    drop: 'Drop your file here',
    or: 'or',
    choose: 'Choose file',
    reading: 'Reading {name} ({size} MB)…',
    parsing: 'Parsing collection…',
    failed: 'Could not open this file: {message}',
  },
  study: {
    loading: 'Loading deck…',
    restoring: 'Restoring…',
    noDeck: 'No deck loaded',
    openHint: 'Open an .apkg / .colpkg file to start browsing or reviewing.',
    openFile: 'Open a file',
    cards: 'Cards',
    searchPh: 'Search cards…',
    clearSearch: 'Clear search (Esc)',
    hideList: 'Hide card list',
    showList: 'Show card list',
    toggleList: 'Toggle card list',
    modeAria: 'Study mode',
    browse: 'Browse',
    review: 'Review',
    noMatch: 'No matching cards',
    browseMeta: 'Card {shown} / {total} · Browse',
    reviewMeta: '{due} due · {total} cards',
    question: 'Question',
    answer: 'Answer',
    caughtUp: 'All caught up',
    noDue: 'Nothing is due right now. Come back later, or reset progress for this deck.',
    resetProgress: 'Reset progress',
    rating: { again: 'Again', hard: 'Hard', good: 'Good', easy: 'Easy' },
    showAnswer: 'Show Answer',
    hideAnswer: 'Hide Answer',
    prev: '‹ Prev',
    next: 'Next ›',
    nothingToBrowse: 'Nothing to browse',
    noCards: 'This deck contains no cards.',
  },
  submit: {
    title: 'Share your Anki deck',
    lead: 'Publish a deck so anyone can browse and review it in the browser. You keep the files — we only list a link to them.',
    backToDecks: 'All decks',
    howItWorksTitle: 'How sharing works',
    howItWorks: [
      'Fill in the form — only three fields are required.',
      'Sign in with GitHub so we can tell you the review result.',
      'We open a public submission ticket and mention you in it.',
      'The moderator reviews it; if approved your deck is published here automatically and GitHub emails you.',
    ],
    signInTitle: 'Sign in with GitHub',
    signInButton: 'Sign in with GitHub',
    signInWhy:
      'We use GitHub only to identify who submitted a deck and to notify you when it is reviewed. We request read-only access to your basic profile — never write access to your repositories.',
    signedInAs: 'Signed in as {login}',
    signOut: 'Sign out',
    groupBasic: 'The essentials',
    langEn: 'English',
    langZh: 'Chinese',
    langBilingual: 'Bilingual (EN + ZH)',
    langOther: 'Other',
    apiUnavailable:
      'The sharing service is temporarily unreachable. Browsing and reviewing still work — please try submitting again later.',
    status: {
      pending: 'In review',
      approved: 'Approved',
      rejected: 'Not accepted',
      other: 'Updated',
    },
    error: {
      network: 'Could not reach the sharing service. Check your connection and try again.',
      validation: 'Some fields need attention before the deck can be submitted.',
      unauthorized: 'Please sign in with GitHub first.',
      forbidden: 'Your GitHub account is not allowed to submit decks.',
      rate_limited: 'You have submitted several decks recently. Please try again tomorrow.',
      error: 'The submission could not be processed. Please try again.',
    },
    groupExtra: 'More options (optional)',
    groupExtraHint: 'Everything here can be skipped — you can always ask the moderator to add it later.',
    field: {
      title: 'Deck name',
      titleHelp: 'Shown as the card title in the gallery. Keep it short and specific.',
      titlePh: 'e.g. HSK 3 Vocabulary',
      downloadUrl: 'Download link',
      downloadUrlPh: 'https://…',
      downloadUrlHelp:
        'A direct link to your .apkg / .colpkg file — a GitHub Release, a cloud drive, or any direct URL.',
      downloadLabel: 'Link label',
      downloadLabelPh: 'GitHub / Baidu Pan / …',
      downloadNote: 'Link note',
      downloadNotePh: 'Extraction code: abcd · 31 MB',
      subtitle: 'One-line summary',
      subtitleHelp: 'One sentence about what is inside — this is what people see first.',
      subtitlePh: 'English ↔ Chinese vocabulary & sentence bank',
      coverUrl: 'Cover image URL',
      coverUrlPh: 'https://…/cover.png',
      coverUrlHelp: 'Leave empty and we generate a clean letter-marked cover for you.',
      content: 'Full description (Markdown)',
      contentHelp: 'Optional. Headings, lists and links are supported.',
      contentPh: '## What is inside\n- 1,200 cards\n- Audio on every card',
      authorName: 'Author nickname',
      authorNamePh: 'How should we credit you?',
      authorUrl: 'Author link',
      authorUrlPh: 'https://github.com/you',
      authorUrlHelp: 'Shown as a clickable link under your nickname.',
      tags: 'Tags',
      tagsPh: 'English, Vocabulary, Cloze',
      tagsHelp: 'Up to 4, comma separated.',
      language: 'Deck language',
      license: 'License',
      previewUrl: 'Instant-preview .apkg URL',
      previewUrlPh: 'https://…/deck.apkg',
      previewUrlHelp:
        'A direct link to a small .apkg so visitors can study online without downloading. Keep it under 4 MB.',
      extraDownload: 'Additional download link',
      noteToOwner: 'Note to the moderator',
      noteToOwnerPh: 'Anything the moderator should know?',
      consent: 'I have the right to share this deck and I accept the {{terms}} and {{content}}.',
      termsLink: 'Terms',
      contentLink: 'Content policy',
    },
    consentRequired: 'Please confirm you have the right to share this deck.',
    submitButton: 'Submit for review',
    submitting: 'Submitting…',
    validation: {
      title: 'Please give your deck a name.',
      downloadUrl: 'Please add a download link (it must start with http:// or https://).',
      subtitle: 'Please add a one-line summary.',
      coverUrl: 'The cover image URL must start with http:// or https://.',
      previewUrl: 'The preview file URL must start with http:// or https://.',
      authorUrl: 'The author link must start with http:// or https://.',
    },
    successTitle: 'Submission received',
    successBody:
      'Your deck is now in the review queue. The moderator will look at it shortly, and GitHub will email you as soon as there is a decision.',
    successTrack: 'Track it on GitHub',
    submitAnother: 'Submit another deck',
    errorTitle: 'Could not submit',
    myTitle: 'My submissions',
    myEmpty: 'You have not submitted a deck yet.',
    statusPending: 'In review',
    statusApproved: 'Published',
    statusRejected: 'Not published',
    statusOther: 'Closed',
    submittedOn: 'Submitted {date}',
    lastUpdate: 'Latest update from the moderator',
    noUpdate: 'No moderator feedback yet.',
    signInToSee: 'Sign in with GitHub to submit a deck and track your submissions.',
    rateLimited: 'You have reached the submission limit for today. Please try again tomorrow.',
  },
  admin: {
    title: 'Deck moderation',
    lead: 'Review community deck submissions and manage what is published.',
    signInRequired: 'Sign in with your GitHub account to open the moderation console.',
    notAuthorized: 'This GitHub account is not on the moderator allowlist.',
    signInButton: 'Sign in with GitHub',
    signOut: 'Sign out',
    tabPending: 'In review',
    tabPublished: 'Published',
    tabRejected: 'Rejected',
    tabAll: 'All',
    empty: 'Nothing here.',
    loading: 'Loading submissions…',
    submittedBy: 'by {login}',
    submittedOn: 'Submitted {date}',
    approve: 'Approve & publish',
    approving: 'Publishing…',
    reject: 'Reject',
    rejecting: 'Rejecting…',
    rejectReason: 'Reason shown to the submitter',
    rejectReasonPh: 'e.g. The download link returns a 404.',
    unpublish: 'Unpublish',
    curated: 'Curated by the owner',
    unpublishing: 'Removing…',
    confirmApprove: 'Publish “{title}” to the site now? This commits to the deck index and deploys automatically.',
    confirmReject: 'Reject “{title}”? The submitter will see your reason.',
    confirmUnpublish: 'Remove “{title}” from the site? This commits to the deck index and deploys automatically.',
    approvedDone: 'Published. The site rebuilds automatically and the deck appears in 2-3 minutes.',
    rejectedDone: 'Rejected. The submitter has been notified on GitHub.',
    unpublishedDone: 'Removed. The site rebuilds automatically.',
    previewCard: 'Preview as card',
    openTicket: 'Open ticket',
    publishedCount: '{count} published',
    pendingCount: '{count} in review',
    refresh: 'Refresh',
    refreshedOn: 'Updated {time}',
  },
  a11y: {
    langSwitch: 'Switch to {lang}',
    openInNewTab: 'opens in a new tab',
  },
  meta: {
    faqTitle: 'FAQ — Anki Browser',
    faqDesc:
      'Answers to the questions people ask about Anki Browser: privacy, supported file types, the SM-2 scheduler, mobile support, and how to share your own deck.',
    privacyTitle: 'Privacy Policy — Anki Browser',
    privacyDesc:
      'How Anki Browser handles your data: deck files are parsed locally in your browser and never uploaded. What we store if you share a deck, and what we never collect.',
    termsTitle: 'Terms of Service — Anki Browser',
    termsDesc:
      'The terms for using Anki Browser and for submitting a deck to the shared deck gallery.',
    contentTitle: 'Content Policy & DMCA — Anki Browser',
    contentDesc:
      'What may be shared in the Anki Browser deck gallery, how licensing works, and how to request removal of infringing content.',
    contactTitle: 'Contact — Anki Browser',
    contactDesc:
      'How to reach the Anki Browser maintainer: bug reports, deck submissions, takedown requests and general questions.',
    submitTitle: 'Share your Anki deck — Anki Browser',
    submitDesc:
      'Submit an .apkg or .colpkg deck to the Anki Browser gallery. Three required fields, free, and your files stay on your own hosting.',
    adminTitle: 'Deck moderation — Anki Browser',
    adminDesc: 'Moderator console. Not indexed.',
    aboutTitle: 'About — Anki Browser',
    aboutDesc: 'How Anki Browser works, and why your data stays on your device.',
    apkgViewerTitle: 'APKG Viewer — Open .apkg Files Online (No Anki Needed)',
    apkgViewerDesc:
      'Free online APKG viewer: open, browse and review .apkg Anki decks in your browser. No install, no registration, no upload — your file never leaves your device.',
    colpkgViewerTitle: 'COLPKG Viewer — Open .colpkg Files Online (No Anki Needed)',
    colpkgViewerDesc:
      'Free online COLPKG viewer: open, browse and review .colpkg Anki collection backups in your browser. No install, no registration, no upload.',
  },
};

const zh = {
  common: {
    backHome: '所有卡组',
    back: '返回',
    loading: '加载中…',
    required: '必填',
    optional: '选填',
    error: '出错了。',
    retry: '重试',
    cancel: '取消',
    close: '关闭',
    copy: '复制',
    copied: '已复制',
    save: '保存',
    moreOptions: '更多选项（选填）',
    yes: '是',
    no: '否',
    neverMind: '算了',
    learnMore: '了解更多',
  },
  nav: {
    main: '主导航',
    decks: '卡组',
    open: '打开文件',
    about: '关于',
    faq: '常见问题',
    share: '分享卡组',
    admin: '管理后台',
    skipToContent: '跳到主要内容',
  },
  lang: {
    label: '语言',
    switchTo: '中文',
    name: { en: '英文', zh: '中文' },
  },
  hero: {
    title: '在浏览器里打开、浏览并复习 .apkg / .colpkg 卡组',
    tagline: '无需安装 Anki、无需注册——直接在浏览器里浏览和复习 Anki 卡组。文件只在你的设备上解析，绝不上传。',
    ctaOpen: '打开 .apkg / .colpkg 文件',
    ctaHow: '如何运作',
    note: '无需 Anki 软件 · 无需注册 · 不上传——你的文件在本地解析，永远不会离开设备。',
    tools: '工具：',
  },
  home: {
    sharedDecks: '共享卡组',
    loadError: '无法加载卡组列表。',
    empty: '还没有发布任何卡组。',
    shareCardTitle: '分享你的卡组',
    shareCardSub: '把你的 .apkg / .colpkg 卡组分享出来，让其他人直接浏览和复习',
    shareCardCta: '投稿卡组',
  },
  deck: {
    openInReviewer: '在复习器中打开',
    openLocalFile: '打开本地文件',
    downloadVia: '通过 {label} 下载',
    download: '下载',
    downloadPending: '下载链接待补充',
    downloadPendingTitle: '站长稍后会补充下载链接',
    updated: '更新于 {date}',
    backToDecks: '所有卡组',
    noIntro: '这个卡组还没有介绍文字。',
  },
  about: {
    backToDecks: '返回卡组列表',
  },
  footer: {
    madeBy: 'Anki Browser · Made by Endril',
    privacy: '隐私政策',
    terms: '服务条款',
    content: '内容与版权',
    contact: '联系',
    faq: '常见问题',
    source: '源码',
  },
  faq: {
    backToDecks: '所有卡组',
  },
  open: {
    title: '打开 Anki 卡组',
    lead: '选择 .apkg（分享卡组）或 .colpkg（整个收藏库备份）。全部解析都在你的设备上完成。',
    drop: '把文件拖到这里',
    or: '或',
    choose: '选择文件',
    reading: '正在读取 {name}（{size} MB）…',
    parsing: '正在解析收藏库…',
    failed: '无法打开该文件：{message}',
  },
  study: {
    loading: '正在加载卡组…',
    restoring: '正在恢复…',
    noDeck: '尚未加载卡组',
    openHint: '先打开一个 .apkg / .colpkg 文件，即可浏览或复习。',
    openFile: '打开文件',
    cards: '卡片列表',
    searchPh: '搜索卡片…',
    clearSearch: '清除搜索（Esc）',
    hideList: '收起卡片列表',
    showList: '展开卡片列表',
    toggleList: '切换卡片列表',
    modeAria: '学习模式',
    browse: '浏览',
    review: '复习',
    noMatch: '没有匹配的卡片',
    browseMeta: '第 {shown} / {total} 张 · 浏览',
    reviewMeta: '到期 {due} 张 · 共 {total} 张',
    question: '问题',
    answer: '答案',
    caughtUp: '全部复习完毕',
    noDue: '当前没有到期的卡片。稍后再来，或重置该卡组的进度。',
    resetProgress: '重置进度',
    rating: { again: '重来', hard: '困难', good: '一般', easy: '简单' },
    showAnswer: '显示答案',
    hideAnswer: '隐藏答案',
    prev: '‹ 上一张',
    next: '下一张 ›',
    nothingToBrowse: '没有可浏览的内容',
    noCards: '该卡组不包含任何卡片。',
  },
  submit: {
    title: '分享你的 Anki 卡组',
    lead: '把你的卡组发布出来，让任何人都能在浏览器里直接浏览和复习。文件仍然由你自己托管——我们只登记一个链接。',
    backToDecks: '所有卡组',
    howItWorksTitle: '分享流程',
    howItWorks: [
      '填写表单——只有三项是必填的。',
      '用 GitHub 登录，这样审核结果才能通知到你。',
      '我们会开一张公开的投稿工单，并在工单里 @ 你。',
      '站长审核；通过后卡组会自动发布到本站，同时 GitHub 会给你发邮件。',
    ],
    signInTitle: '使用 GitHub 登录',
    signInButton: '使用 GitHub 登录',
    signInWhy:
      '我们只用 GitHub 来确认投稿人身份，并在审核有结果时通知你。只申请你基本资料的只读权限，绝不申请你仓库的写入权限。',
    signedInAs: '已登录：{login}',
    signOut: '退出登录',
    groupBasic: '必填信息',
    langEn: '英文',
    langZh: '中文',
    langBilingual: '双语（英 + 中）',
    langOther: '其他',
    apiUnavailable: '分享服务暂时不可用。浏览与复习不受影响，请稍后再提交。',
    status: {
      pending: '审核中',
      approved: '已通过',
      rejected: '未通过',
      other: '有更新',
    },
    error: {
      network: '无法连接分享服务，请检查网络后重试。',
      validation: '部分字段需要修改后才能提交。',
      unauthorized: '请先用 GitHub 登录。',
      forbidden: '你的 GitHub 账号暂无投稿权限。',
      rate_limited: '你最近提交较多，请明天再试。',
      error: '提交处理失败，请重试。',
    },
    groupExtra: '更多选项（选填）',
    groupExtraHint: '这里都可以留空——你随时可以请站长后续补充。',
    field: {
      title: '卡组名称',
      titleHelp: '将作为卡组页标题展示，建议简短明确。',
      titlePh: '例如：HSK 3 词汇',
      downloadUrl: '下载链接',
      downloadUrlPh: 'https://…',
      downloadUrlHelp: '指向你 .apkg / .colpkg 文件的直接链接——GitHub Release、网盘或任意直链都可以。',
      downloadLabel: '链接标签',
      downloadLabelPh: 'GitHub / 百度网盘 / …',
      downloadNote: '链接备注',
      downloadNotePh: '提取码：abcd · 31 MB',
      subtitle: '一句话简介',
      subtitleHelp: '一句话说明卡组内容——这是访客最先看到的部分。',
      subtitlePh: '英汉词汇与例句库',
      coverUrl: '封面图片链接',
      coverUrlPh: 'https://…/cover.png',
      coverUrlHelp: '留空的话，我们会为你生成一张干净的首字母封面。',
      content: '详细介绍（Markdown）',
      contentHelp: '选填。支持标题、列表与链接。',
      contentPh: '## 卡组内容\n- 1200 张卡片\n- 每张卡都有音频',
      authorName: '作者昵称',
      authorNamePh: '希望我们怎么署名？',
      authorUrl: '作者主页链接',
      authorUrlPh: 'https://github.com/you',
      authorUrlHelp: '会以可点击链接的形式显示在昵称下方。',
      tags: '标签',
      tagsPh: '英语, 词汇, 挖空',
      tagsHelp: '最多 4 个，用逗号分隔。',
      language: '卡组语言',
      license: '许可协议',
      previewUrl: '在线试看 .apkg 直链',
      previewUrlPh: 'https://…/deck.apkg',
      previewUrlHelp: '指向一个体积较小的 .apkg 的直链，访客无需下载即可在线复习。请控制在 4 MB 以内。',
      extraDownload: '附加下载链接',
      noteToOwner: '给站长的留言',
      noteToOwnerPh: '有什么需要站长知道的吗？',
      consent: '我确认我有权分享这个卡组，并接受{{terms}}与{{content}}。',
    },
    consentRequired: '请确认你有权分享这个卡组。',
    submitButton: '提交审核',
    submitting: '提交中…',
    validation: {
      title: '请填写卡组名称。',
      downloadUrl: '请填写下载链接（必须以 http:// 或 https:// 开头）。',
      subtitle: '请填写一句话简介。',
      coverUrl: '封面图片链接必须以 http:// 或 https:// 开头。',
      previewUrl: '试看文件链接必须以 http:// 或 https:// 开头。',
      authorUrl: '作者主页链接必须以 http:// 或 https:// 开头。',
    },
    successTitle: '投稿已收到',
    successBody: '你的卡组已进入审核队列。站长会尽快查看，一旦有结果 GitHub 就会给你发邮件。',
    successTrack: '在 GitHub 上跟踪进度',
    submitAnother: '再投一个卡组',
    errorTitle: '提交失败',
    myTitle: '我的投稿',
    myEmpty: '你还没有投稿过卡组。',
    statusPending: '审核中',
    statusApproved: '已发布',
    statusRejected: '未通过',
    statusOther: '已关闭',
    submittedOn: '提交于 {date}',
    lastUpdate: '站长最新反馈',
    noUpdate: '站长还没有回复。',
    signInToSee: '使用 GitHub 登录即可投稿并跟踪你的投稿状态。',
    rateLimited: '你今天已达到投稿次数上限，请明天再来。',
  },
  admin: {
    title: '卡组审核',
    lead: '审核社区投稿的卡组，并管理已发布的内容。',
    signInRequired: '请使用你的 GitHub 账号登录以进入管理后台。',
    notAuthorized: '这个 GitHub 账号不在站长白名单中。',
    signInButton: '使用 GitHub 登录',
    signOut: '退出登录',
    tabPending: '待审核',
    tabPublished: '已发布',
    tabRejected: '未通过',
    tabAll: '全部',
    empty: '这里什么都没有。',
    loading: '正在加载投稿…',
    submittedBy: '来自 {login}',
    submittedOn: '提交于 {date}',
    approve: '通过并发布',
    approving: '发布中…',
    reject: '拒绝',
    rejecting: '提交中…',
    rejectReason: '展示给投稿人的理由',
    rejectReasonPh: '例如：下载链接返回 404。',
    unpublish: '下架',
    curated: '站长维护',
    unpublishing: '移除中…',
    confirmApprove: '现在把“{title}”发布到站点？这会写入卡组索引并自动部署。',
    confirmReject: '拒绝“{title}”？投稿人会看到你填写的理由。',
    confirmUnpublish: '把“{title}”从站点移除？这会写入卡组索引并自动部署。',
    approvedDone: '已发布。站点会自动重新构建，约 2-3 分钟后卡组即可访问。',
    rejectedDone: '已拒绝。投稿人会在 GitHub 上收到通知。',
    unpublishedDone: '已移除。站点会自动重新构建。',
    previewCard: '预览卡片',
    openTicket: '打开工单',
    publishedCount: '已发布 {count} 个',
    pendingCount: '待审核 {count} 个',
    refresh: '刷新',
    refreshedOn: '更新于 {time}',
  },
  a11y: {
    langSwitch: '切换到{lang}',
    openInNewTab: '在新标签页打开',
  },
  meta: {
    faqTitle: '常见问题 — Anki Browser',
    faqDesc:
      '关于 Anki Browser 的常见疑问解答：隐私与本地解析、支持的文件格式、SM-2 复习调度、手机是否可用，以及如何分享自己的卡组。',
    privacyTitle: '隐私政策 — Anki Browser',
    privacyDesc:
      'Anki Browser 如何处理你的数据：卡组文件在你的浏览器本地解析、绝不上传；分享卡组时会存储哪些信息，以及我们绝不收集什么。',
    termsTitle: '服务条款 — Anki Browser',
    termsDesc: '使用 Anki Browser 以及向共享卡组库投稿卡组的条款。',
    contentTitle: '内容政策与版权（DMCA）— Anki Browser',
    contentDesc: 'Anki Browser 卡组库允许分享什么内容、许可协议如何运作，以及如何要求移除侵权内容。',
    contactTitle: '联系 — Anki Browser',
    contactDesc: '如何联系 Anki Browser 维护者：问题反馈、卡组投稿、侵权下架请求与一般咨询。',
    submitTitle: '分享你的 Anki 卡组 — Anki Browser',
    submitDesc:
      '把 .apkg / .colpkg 卡组投稿到 Anki Browser 卡组库。只需填写三项必填内容，完全免费，文件仍由你自己托管。',
    adminTitle: '卡组审核 — Anki Browser',
    adminDesc: '站长审核后台。不参与索引。',
    aboutTitle: '关于 — Anki Browser',
    aboutDesc: 'Anki Browser 如何运作，以及为什么你的数据只留在自己的设备上。',
    apkgViewerTitle: 'APKG 查看器 — 在线打开 .apkg 卡组，无需安装 Anki',
    apkgViewerDesc:
      '.apkg 是 Anki 分享卡组格式。用免费的在线 APKG 查看器在浏览器里直接打开、浏览和复习，无需安装 Anki、无需注册，文件绝不上传。',
    colpkgViewerTitle: 'COLPKG 查看器 — 在线打开 .colpkg 卡组，无需安装 Anki',
    colpkgViewerDesc:
      '.colpkg 是 Anki 收藏库备份格式。用免费的在线 COLPKG 查看器在浏览器里打开整个收藏库并复习，无需安装 Anki，文件绝不上传。',
  },
};

/** @type {Record<string, any>} */
const DICTS = { en, zh };

/**
 * Translate a dotted key path. Falls back to English, then to the key itself so
 * a missing string is obvious on screen instead of blank.
 * @param {string} lang
 * @param {string} path e.g. 'submit.field.title'
 * @param {Record<string, string|number>} [vars] `{name}` placeholders
 */
export function t(lang, path, vars) {
  const dict = DICTS[normalizeLang(lang)] ?? DICTS[DEFAULT_LANG];
  let out = walk(dict, path);
  if (out === undefined) out = walk(DICTS[DEFAULT_LANG], path);
  if (out === undefined) return path;
  if (vars) out = String(out).replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
  return out;
}

/** Like `t()` but for list values (arrays of strings). */
export function tl(lang, path, vars) {
  const dict = DICTS[normalizeLang(lang)] ?? DICTS[DEFAULT_LANG];
  let out = walk(dict, path);
  if (out === undefined) out = walk(DICTS[DEFAULT_LANG], path);
  if (!Array.isArray(out)) return [];
  if (!vars) return out;
  return out.map((s) => String(s).replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m)));
}

/**
 * @param {Record<string, any>} obj
 * @param {string} path
 */
function walk(obj, path) {
  let cur = obj;
  for (const part of path.split('.')) {
    if (cur == null || typeof cur !== 'object' || !(part in cur)) return undefined;
    cur = cur[part];
  }
  return cur;
}

/** Coerce anything into a supported language code. */
export function normalizeLang(value) {
  const v = String(value ?? '').toLowerCase();
  if (v === 'zh' || v.startsWith('zh-') || v === 'zh_cn' || v === 'zh-cn' || v === 'cn') return 'zh';
  return DEFAULT_LANG;
}

/** The other language — used by the header switcher. */
export function otherLang(lang) {
  return normalizeLang(lang) === 'zh' ? 'en' : 'zh';
}

/**
 * Pick the starting language.
 * Precedence: explicit URL prefix > stored choice > browser hint > default.
 * @param {{pathLang?: string, stored?: string|null, acceptLanguage?: string}} opts
 */
export function detectLang(opts = {}) {
  if (opts.pathLang) return normalizeLang(opts.pathLang);
  if (opts.stored) return normalizeLang(opts.stored);
  return normalizeLang(opts.acceptLanguage);
}

/**
 * Deep key parity check used by `scripts/check-i18n.mjs`.
 * `flat[lang][key]` is the array length for list values, or `null` for strings.
 * @returns {{missing: string[], extra: string[], flat: Record<string, Record<string, number|null>>}}
 */
export function checkParity() {
  const flat = { en: flatten(en), zh: flatten(zh) };
  const enKeys = new Set(Object.keys(flat.en));
  const zhKeys = new Set(Object.keys(flat.zh));
  const missing = [...enKeys].filter((k) => !zhKeys.has(k)).sort();
  const extra = [...zhKeys].filter((k) => !enKeys.has(k)).sort();
  return { missing, extra, flat };
}

function flatten(obj, prefix = '', out = {}) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (Array.isArray(v)) out[key] = v.length;
    else if (v && typeof v === 'object') flatten(v, key, out);
    else out[key] = null;
  }
  return out;
}

/** Array-valued keys must have the same length in both languages. */
export function checkArrayLengths() {
  const { flat } = checkParity();
  const problems = [];
  for (const [k, len] of Object.entries(flat.en)) {
    if (len === null) continue; // plain string — lengths naturally differ across languages
    const zhLen = flat.zh[k];
    if (zhLen !== len) problems.push(`${k}: en=${len} zh=${zhLen}`);
  }
  return problems;
}

export default { t, tl, normalizeLang, otherLang, detectLang, LANGS, LANG_META, LANG_SWITCH_LABEL, checkParity };
