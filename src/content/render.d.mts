/** Type declarations for the plain-JS `render.mjs` (shared by the SPA and the SEO prerender). */

/** A downloadable source for a deck (Baidu Netdisk, GitHub Release, direct URL, …). */
export interface DownloadLink {
  url: string;
  /** Button label, e.g. "百度网盘" / "GitHub Release" / "Direct download". Defaults to "Download". */
  label?: string;
  /** Optional hint shown under the button, e.g. "提取码 abcd". */
  note?: string;
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
}

export interface LinkSet {
  home: () => string;
  about: () => string;
  open: () => string;
  deck: (slug: string) => string;
  study: (slug: string) => string;
}

export const SITE_URL: string;
export const SITE_TITLE: string;
export const SITE_TAGLINE: string;
export const SITE_DESCRIPTION: string;
export const SITE_KEYWORDS: string;
export const SITE_IMAGE: string;
export const seoLinks: LinkSet;
export const appLinks: LinkSet;

export function escapeHtml(input: string): string;
export function renderMarkdown(md: string): string;
export function deckCoverHtml(deck: DeckMeta): string;
export function decksGalleryHtml(decks: DeckMeta[], links?: LinkSet): string;
export function deckArticleHtml(deck: DeckMeta, mdHtml: string, links?: LinkSet): string;
export function siteHeaderHtml(opts?: { active?: string; links?: LinkSet }): string;
export function siteFooterHtml(): string;
export function heroHtml(links?: LinkSet): string;
export function aboutBodyHtml(): string;
export function jsonLdSite(): object;
export function jsonLdDeck(deck: DeckMeta): object;
