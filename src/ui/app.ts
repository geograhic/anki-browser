/**
 * Application shell + route dispatch.
 *
 * Language handling: the first URL segment may be a language prefix (`#/zh/faq`
 * or `/anki-browser/zh/faq/`). When present it wins; otherwise the visitor's
 * saved choice applies. Language changes re-render the current route in place —
 * no reload — which is why every page reads its inputs through PageContext.
 */
import { startRouter, currentRoute, type Route } from './router';
import {
  siteHeaderHtml,
  siteFooterHtml,
  appLinks,
  localizeLinks,
  langSwitchHref,
  type LinkSet,
} from '../content/render.mjs';
import { getLang, setLang, langFromLocation, type Lang } from './i18n';
import { renderHome } from './pages/home';
import { renderDeck } from './pages/deck';
import { renderOpen } from './pages/open';
import { renderStudy } from './pages/study';
import { renderAbout } from './pages/about';
import { renderViewer } from './pages/viewer';
import { renderFaq } from './pages/faq';
import { renderLegal, type LegalKind } from './pages/legal';
import { renderSubmit } from './pages/submit';
import { renderAdmin } from './pages/admin';
import { qs } from './dom';

/** Route segment -> language-twin key (mirrored pages only). */
const MIRROR_KEYS: Record<string, string> = {
  '': 'home',
  about: 'about',
  faq: 'faq',
  privacy: 'privacy',
  terms: 'terms',
  'content-policy': 'contentPolicy',
  contact: 'contact',
  submit: 'submit',
  'apkg-viewer': 'apkgViewer',
  'colpkg-viewer': 'colpkgViewer',
};

const LEGAL_KINDS: Record<string, LegalKind> = {
  privacy: 'privacy',
  terms: 'terms',
  'content-policy': 'content',
  contact: 'contact',
};

/** Nav items that should highlight when the matching route is active. */
const NAV_KEYS = new Set(['home', 'open', 'submit', 'faq', 'about']);

function activeKey(first: string): string {
  // `open` is a nav item but language-neutral (not in MIRROR_KEYS), so check
  // the visible nav keys first, then resolve mirrored routes (faq, submit…).
  if (NAV_KEYS.has(first)) return first;
  const k = MIRROR_KEYS[first] ?? '';
  return NAV_KEYS.has(k) ? k : '';
}

export function renderApp(): void {
  const app = document.getElementById('app');
  if (!app) return;

  // Turn a prerendered pathname URL (`/anki-browser/zh/faq/`) into its hash
  // equivalent (`/anki-browser/#/zh/faq`) the moment the SPA boots, so hash
  // navigation (including the language switcher) never stacks on top of a
  // pathname route and language prefixes cannot get stranded in the URL.
  normalizeUrlToHash();

  // Coalesce renders: a language switch fires both the click handler and the
  // hash change, and both must end in exactly one paint.
  let pending: Route | null = null;
  let scheduled = false;
  const schedule = (route: Route) => {
    pending = route;
    if (scheduled) return;
    scheduled = true;
    queueMicrotask(() => {
      scheduled = false;
      const r = pending!;
      pending = null;
      void render(r, app);
    });
  };

  // The switcher is an <a> for crawlers and no-JS visitors. Always persist the
  // target language FIRST so that the language-neutral URL we navigate to
  // (#/faq — English has no prefix) resolves through localStorage to English
  // instead of falling back to the previously saved Chinese choice.
  document.addEventListener('click', (e) => {
    const el = (e.target as HTMLElement)?.closest('.lang-switch') as HTMLElement | null;
    if (!el) return;
    const next = (el.dataset.langSwitch as Lang) ?? getLang();
    setLang(next);
    const href = el.getAttribute('href') ?? '';
    if (href === location.pathname + location.hash) {
      // Language-neutral page (deck / study / …): re-render in place.
      e.preventDefault();
      schedule(currentRoute());
    }
    // Otherwise let the browser follow the twin link (hash or full path);
    // the router repaints and reads the language we just saved.
  });

  startRouter((route) => schedule(route));
}

function normalizeUrlToHash(): void {
  if (location.hash.startsWith('#/')) return; // already hash-routed
  const baseRaw = ((import.meta as any).env?.BASE_URL as string) || '/anki-browser/';
  const base = baseRaw.replace(/\/+$/, '');
  const rest = location.pathname.startsWith(base)
    ? location.pathname.slice(base.length)
    : location.pathname;
  const segs = rest.split('/').filter(Boolean);
  history.replaceState(null, '', `${base}/#/${segs.join('/')}`);
}

async function render(route: Route, app: HTMLElement): Promise<void> {
  const segments = [...route.segments];

  // 1. Language: URL prefix wins, then the saved choice.
  const urlLang = langFromLocation();
  if (urlLang) setLang(urlLang);
  const lang = getLang();
  if (urlLang) segments.shift();

  const [first = ''] = segments;
  const links: LinkSet = localizeLinks(appLinks, lang);
  const pageKey = MIRROR_KEYS[first] ?? '';
  const switchHref = pageKey
    ? langSwitchHref(appLinks, pageKey, lang)
    : location.pathname + location.hash;

  // The study view is an immersive fixed-height two-pane app: the page itself
  // must not scroll (each pane scrolls internally). Rendering the site footer
  // there would add page height and reintroduce page-level scrolling.
  const footer = first === 'study' ? '' : siteFooterHtml({ links, lang });
  app.innerHTML =
    siteHeaderHtml({ active: activeKey(first), links, lang, pageKey, switchHref }) +
    '<main id="outlet"></main>' +
    footer;

  const outlet = qs('#outlet', app)!;
  const ctx = { lang, links, pageKey, segments, query: route.query };

  try {
    if (first === 'deck') await renderDeck(outlet, ctx);
    else if (first === 'open') renderOpen(outlet);
    else if (first === 'study') await renderStudy(outlet, route);
    else if (first === 'about') renderAbout(outlet, ctx);
    else if (first === 'faq') renderFaq(outlet, ctx);
    else if (first === 'privacy' || first === 'terms' || first === 'content-policy' || first === 'contact')
      renderLegal(outlet, ctx, LEGAL_KINDS[first]);
    else if (first === 'submit') await renderSubmit(outlet, ctx);
    else if (first === 'admin') await renderAdmin(outlet, ctx);
    else if (first === 'apkg-viewer' || first === 'colpkg-viewer') renderViewer(outlet, ctx);
    else await renderHome(outlet, ctx);
  } catch (e) {
    outlet.innerHTML = `<div class="error-note">${(e as Error).message}</div>`;
  }
}
