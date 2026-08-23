/**
 * SPA routes for the SEO landing pages.
 *
 * The prerender emits real path pages (/apkg-viewer/, /zh/, ...). When the SPA
 * boots on one of those URLs the router reads location.pathname, so we must
 * render the SAME markup here — otherwise the landing content would be replaced
 * by the home page. The shared builders in `src/content/render.mjs` guarantee
 * static and client-rendered markup never drift.
 */
import { viewerBodyHtml, zhHomeBodyHtml, appLinks } from '../../content/render.mjs';

export function renderViewer(outlet: HTMLElement, route: { segments: string[] }): void {
  const [first, second] = route.segments;
  if (first === 'zh') {
    if (second === 'apkg-viewer') {
      outlet.innerHTML = viewerBodyHtml({ fmt: 'apkg', lang: 'zh', links: appLinks });
    } else if (second === 'colpkg-viewer') {
      outlet.innerHTML = viewerBodyHtml({ fmt: 'colpkg', lang: 'zh', links: appLinks });
    } else {
      outlet.innerHTML = zhHomeBodyHtml(appLinks);
    }
    return;
  }
  if (first === 'apkg-viewer') {
    outlet.innerHTML = viewerBodyHtml({ fmt: 'apkg', lang: 'en', links: appLinks });
  } else if (first === 'colpkg-viewer') {
    outlet.innerHTML = viewerBodyHtml({ fmt: 'colpkg', lang: 'en', links: appLinks });
  }
}
