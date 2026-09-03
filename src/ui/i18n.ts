/**
 * Client-side language state.
 *
 * Resolution order (first match wins):
 *   1. an explicit `/zh/…` or `#/zh/…` location (the SEO-canonical signal)
 *   2. the visitor's saved choice in localStorage
 *   3. the browser's preferred language
 *   4. English
 *
 * Switching language never reloads the page: `onLangChange` listeners re-render
 * the current route, which is also why every page render must read the language
 * through this module instead of caching it.
 */
import {
  detectLang,
  normalizeLang,
  otherLang as flip,
  t as lookup,
  tl as lookupList,
  type Lang,
} from '../content/i18n.mjs';

export type { Lang };

const STORAGE_KEY = 'anki-browser:lang';

function stored(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function basePath(): string {
  const b = (import.meta as any).env?.BASE_URL as string | undefined;
  return b && b.startsWith('/') ? b : '/anki-browser/';
}

/** Language encoded in the current URL (path or hash), if any. */
export function langFromLocation(): Lang | undefined {
  const raw = location.hash.startsWith('#/')
    ? location.hash.slice(2)
    : location.pathname.startsWith(basePath())
      ? location.pathname.slice(basePath().length)
      : location.pathname;
  const first = (raw.split('/')[0] ?? '').toLowerCase();
  if (first === 'zh') return 'zh';
  if (first === 'en') return 'en';
  return undefined;
}

let current: Lang = normalizeLang(
  detectLang({
    pathLang: langFromLocation(),
    stored: stored(),
    acceptLanguage: typeof navigator !== 'undefined' ? navigator.language : undefined,
  }),
);

const listeners = new Set<(lang: Lang) => void>();

function applyDocumentLang(lang: Lang): void {
  document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
}

export function getLang(): Lang {
  return current;
}

export function otherLang(lang: Lang = current): Lang {
  return flip(lang);
}

export function setLang(lang: Lang): void {
  const next = normalizeLang(lang);
  // Always persist — a `/zh/…` URL must stick when the visitor later lands on a
  // language-neutral page (deck, study, admin), which has no prefix to read.
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    /* private mode: the choice simply is not remembered */
  }
  if (next === current) return;
  current = next;
  applyDocumentLang(next);
  for (const fn of listeners) fn(next);
}

/** Subscribe to language changes; returns an unsubscribe function. */
export function onLangChange(fn: (lang: Lang) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Translate with the current language bound. */
export function t(path: string, vars?: Record<string, string | number>): string {
  return lookup(current, path, vars);
}

/** Translate a list-valued key with the current language bound. */
export function tl(path: string, vars?: Record<string, string | number>): string[] {
  return lookupList(current, path, vars);
}

applyDocumentLang(current);
