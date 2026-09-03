/**
 * Legal pages: Privacy Policy, Terms of Service, Content & DMCA, Contact.
 *
 * All four share one builder; the copy lives in `content/pages.mjs` so the
 * static prerender and this SPA route are byte-for-byte the same content.
 */
import { legalBodyHtml } from '../../content/render.mjs';
import type { PageContext } from './context';

export type LegalKind = 'privacy' | 'terms' | 'content' | 'contact';

export function renderLegal(outlet: HTMLElement, ctx: PageContext, kind: LegalKind): void {
  outlet.innerHTML = legalBodyHtml(kind, ctx.links, ctx.lang);
}
