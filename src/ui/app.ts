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

function activeKey(first: string): string {
  if (first === 'open') return 'open';
  if (first === 'about') return 'about';
  return 'home';
}

export function renderApp(): void {
  const app = document.getElementById('app');
  if (!app) return;

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

  // The switcher is an <a> for crawlers and no-JS visitors. When it points at
  // the current URL (language-neutral pages), navigation would be a no-op — so
  // flip the language and repaint here instead.
  document.addEventListener('click', (e) => {
    const el = (e.target as HTMLElement)?.closest('.lang-switch') as HTMLElement | null;
    if (!el) return;
    const href = el.getAttribute('href') ?? '';
    if (href === location.pathname + location.hash) {
      e.preventDefault();
      setLang((el.dataset.langSwitch as Lang) ?? getLang());
      schedule(currentRoute());
    }
    // Otherwise let the browser follow the twin link; the router repaints.
  });

  startRouter((route) => schedule(route));
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
