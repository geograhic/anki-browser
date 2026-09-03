import type { LANGS, LANG_META, LANG_SWITCH_LABEL } from './i18n.mjs';

export type Lang = (typeof LANGS)[number];

export type LangMeta = {
  html: string;
  locale: string;
  label: string;
  short: string;
  dir: 'ltr' | 'rtl';
};

export declare const LANGS: readonly ['en', 'zh'];
export declare const DEFAULT_LANG: 'en';
export declare const LANG_META: Record<Lang, LangMeta>;
export declare const LANG_SWITCH_LABEL: Record<Lang, string>;

export declare function t(
  lang: string,
  path: string,
  vars?: Record<string, string | number>,
): string;

export declare function tl(
  lang: string,
  path: string,
  vars?: Record<string, string | number>,
): string[];

export declare function normalizeLang(value: unknown): Lang;
export declare function otherLang(lang: string): Lang;

export declare function detectLang(opts?: {
  pathLang?: string;
  stored?: string | null;
  acceptLanguage?: string;
}): Lang;

/** `flat[lang][key]` is the array length for list values, `null` for strings. */
export declare function checkParity(): {
  missing: string[];
  extra: string[];
  flat: Record<string, Record<string, number | null>>;
};

export declare function checkArrayLengths(): string[];
