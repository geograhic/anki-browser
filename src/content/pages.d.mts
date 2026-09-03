export type Lang = 'en' | 'zh';

export type Faq = { q: string; a: string };

export type ContentSection = {
  h2: string;
  paras?: string[];
  /** Rendered after the list, for sections that sandwich a list between text. */
  parasAfter?: string[];
  list?: string[];
};

export type ContentPage = {
  h1: string;
  lead: string;
  updated?: string;
  sections: ContentSection[];
  faq?: Faq[];
};

export type ViewerPage = {
  h1: string;
  lead: string;
  ctaLabel: string;
  note: string;
  sections: ContentSection[];
  faq: Faq[];
};

export declare const SITE_URL: string;
export declare const CONTENT_UPDATED: string;
export declare const REPO_URL: string;
export declare const SUBMISSIONS_REPO_URL: string;
export declare const OWNER_NAME: string;
export declare const OWNER_URL: string;
export declare const OWNER_GITHUB: string;
export declare const CONTACT_EMAIL: string;
export declare const SUPPORTED_LICENSES: string[];

export declare function viewerContent(fmt: 'apkg' | 'colpkg', lang: Lang): ViewerPage;
export declare function aboutContent(lang: Lang): ContentPage;
export declare function faqContent(lang: Lang): ContentPage;
export declare function legalContent(
  kind: 'privacy' | 'terms' | 'content' | 'contact',
  lang: Lang,
): ContentPage;
