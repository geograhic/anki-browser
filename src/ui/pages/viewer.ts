/**
 * SPA routes for the .apkg / .colpkg viewer landing pages.
 *
 * The prerender emits real path pages (/apkg-viewer/, /zh/apkg-viewer/, …).
 * When the SPA boots on one of those URLs the router reads `location.pathname`,
 * so this module must render the SAME markup — the shared builders in
 * `src/content/render.mjs` guarantee static and client-rendered content can
 * never drift apart.
 */
import { viewerBodyHtml } from '../../content/render.mjs';
import type { PageContext } from './context';

export function renderViewer(outlet: HTMLElement, ctx: PageContext): void {
  const [first] = ctx.segments;
  if (first === 'apkg-viewer') {
    outlet.innerHTML = viewerBodyHtml({ fmt: 'apkg', lang: ctx.lang, links: ctx.links });
  } else if (first === 'colpkg-viewer') {
    outlet.innerHTML = viewerBodyHtml({ fmt: 'colpkg', lang: ctx.lang, links: ctx.links });
  }
}
