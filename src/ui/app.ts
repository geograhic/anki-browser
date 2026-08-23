import { startRouter, type Route } from './router';
import { siteHeaderHtml, siteFooterHtml, appLinks } from '../content/render.mjs';
import { renderHome } from './pages/home';
import { renderDeck } from './pages/deck';
import { renderOpen } from './pages/open';
import { renderStudy } from './pages/study';
import { renderAbout } from './pages/about';
import { renderViewer } from './pages/viewer';
import { qs } from './dom';

export function renderApp(): void {
  const app = document.getElementById('app');
  if (!app) return;
  startRouter((route) => void render(route, app));
}

function activeKey(segments: string[]): string {
  const f = segments[0];
  if (f === 'open') return 'open';
  if (f === 'about') return 'about';
  return 'home';
}

async function render(route: Route, app: HTMLElement): Promise<void> {
  const key = activeKey(route.segments);
  app.innerHTML =
    siteHeaderHtml({ active: key, links: appLinks }) +
    '<main id="outlet"></main>' +
    siteFooterHtml();

  const outlet = qs('#outlet', app)!;
  const [first] = route.segments;

  try {
    if (first === 'deck') await renderDeck(outlet, route);
    else if (first === 'open') renderOpen(outlet);
    else if (first === 'study') await renderStudy(outlet, route);
    else if (first === 'about') renderAbout(outlet);
    else if (first === 'apkg-viewer' || first === 'colpkg-viewer' || first === 'zh')
      renderViewer(outlet, route);
    else await renderHome(outlet);
  } catch (e) {
    outlet.innerHTML = `<div class="error-note">${(e as Error).message}</div>`;
  }
}
