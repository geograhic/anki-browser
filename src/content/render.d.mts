/** Type declarations for the plain-JS `render.mjs` (shared by the SPA and the SEO prerender). */

export type Lang = 'en' | 'zh';

/** A downloadable source for a deck (Baidu Netdisk, GitHub Release, direct URL, …). */
export interface DownloadLink {
  url: string;
  /** Button label, e.g. "百度网盘" / "GitHub Release" / "Direct download". Defaults to "Download". */
  label?: string;
  /** Optional hint shown under the button, e.g. "提取码 abcd". */
  note?: string;
}

export interface DeckAuthor {
  name: string;
  /** Optional homepage / profile link rendered as a clickable credit. */
  url?: string;
}

export interface DeckMeta {
  slug: string;
  title: string;
  subtitle?: string;
  description?: string;
  tags?: string[];
  language?: string;
  cover?: string;
  /** One or more download sources. Legacy `baiduLink` string is also accepted. */
  downloads?: DownloadLink[];
  baiduLink?: string;
  /** Inline Markdown intro text (owner-edited). Takes priority over `markdown`. */
  content?: string;
  /** Legacy: name of a per-deck .md file under public/decks/. */
  markdown?: string;
  previewFile?: string;
  featured?: boolean;
  updated?: string;
  /** Credit for a community submission. */
  author?: DeckAuthor | string;
  /** Licence label chosen at submission time; defaults to CC BY-NC 4.0. */
  license?: string;
  /** Provenance of a community submission. */
  submission?: {
    issue?: number;
    submittedBy?: string;
    approvedAt?: string;
  };
}

export interface LinkSet {
  home: () => string;
  about: () => string;
  open: () => string;
  deck: (slug: string) => string;
  study: (slug: string) => string;
  faq: () => string;
  privacy: () => string;
  terms: () => string;
  contentPolicy: () => string;
  contact: () => string;
  submit: () => string;
  admin: () => string;
  apkgViewer: () => string;
  colpkgViewer: () => string;
  zhHome: () => string;
  zhAbout: () => string;
  zhFaq: () => string;
  zhPrivacy: () => string;
  zhTerms: () => string;
  zhContentPolicy: () => string;
  zhContact: () => string;
  zhSubmit: () => string;
  zhApkg: () => string;
  zhColpkg: () => string;
}

export const SITE_URL: string;
export const SITE_TITLE: string;
export const SITE_TAGLINE: string;
export const SITE_DESCRIPTION: string;
export const SITE_KEYWORDS: string;
export const SITE_IMAGE: string;
export const seoLinks: LinkSet;
export const appLinks: LinkSet;

/** Route key <-> its translation twin. */
export const LANG_TWIN: Record<string, string>;

/**
 * Resolve a link set for one language: every mirrored key points at that
 * language's URL. Also carries a hidden `__raw` reference to the input set.
 */
export function localizeLinks(links: LinkSet, lang: string): LinkSet;

/** Where the header language switcher should point. */
export function langSwitchHref(links: LinkSet, pageKey: string, lang: string): string;

export function htmlLang(lang: string): string;
export function ogLocales(lang: string): { locale: string; alternates: string[] };

export function escapeHtml(input: string): string;
export function renderMarkdown(md: string): string;
export function deckCoverHtml(deck: DeckMeta): string;

export function shareEntryCardHtml(links?: LinkSet, lang?: string): string;
export function decksGalleryHtml(
  decks: DeckMeta[],
  links?: LinkSet,
  opts?: { lang?: string; shareCard?: boolean },
): string;
export function deckArticleHtml(
  deck: DeckMeta,
  mdHtml: string,
  links?: LinkSet,
  lang?: string,
): string;

export function siteHeaderHtml(opts?: {
  active?: string;
  links?: LinkSet;
  lang?: string;
  pageKey?: string;
  /** Explicit switcher target; overrides the computed language twin. */
  switchHref?: string;
}): string;
export function siteFooterHtml(opts?: { links?: LinkSet; lang?: string }): string;
export function heroHtml(links?: LinkSet, lang?: string): string;

export interface ContentSection {
  h2: string;
  paras?: string[];
  parasAfter?: string[];
  list?: string[];
}
export interface ContentPage {
  h1: string;
  lead: string;
  updated?: string;
  sections: ContentSection[];
  faq?: { q: string; a: string }[];
}

export function contentPageHtml(
  content: ContentPage,
  opts?: {
    links?: LinkSet;
    lang?: string;
    backKey?: string;
    afterLead?: string;
    afterBody?: string;
  },
): string;

export function aboutBodyHtml(links?: LinkSet, lang?: string): string;
export function faqBodyHtml(links?: LinkSet, lang?: string): string;
export function legalBodyHtml(
  kind: 'privacy' | 'terms' | 'content' | 'contact',
  links?: LinkSet,
  lang?: string,
): string;
export function submitBodyHtml(opts?: {
  links?: LinkSet;
  lang?: string;
  signInUrl?: string;
}): string;
export function homeBodyHtml(opts?: {
  links?: LinkSet;
  lang?: string;
  galleryHtml?: string;
}): string;

export interface ViewerFaq {
  q: string;
  a: string;
}
export interface ViewerContent extends ContentPage {
  ctaLabel: string;
  note: string;
  faq: ViewerFaq[];
}
export function viewerContent(fmt: 'apkg' | 'colpkg', lang: Lang): ViewerContent;
export function viewerBodyHtml(opts: {
  fmt: 'apkg' | 'colpkg';
  lang?: Lang;
  links?: LinkSet;
}): string;

export function jsonLdSite(lang?: string): object;
export function jsonLdOrganization(): object;
export function jsonLdBreadcrumb(items: { name: string; url: string }[]): object;
export function jsonLdWebPage(opts: {
  name: string;
  url: string;
  description?: string;
  lang?: string;
  type?: string;
}): object;
export function jsonLdDeck(deck: DeckMeta): object;
export function jsonLdFaq(faqs: ViewerFaq[]): object;
export function licenseUrl(label?: string): string;

export const CONTENT_UPDATED: string;
export const REPO_URL: string;
export const SUBMISSIONS_REPO_URL: string;
export const CONTACT_EMAIL: string;
export const SUPPORTED_LICENSES: string[];
