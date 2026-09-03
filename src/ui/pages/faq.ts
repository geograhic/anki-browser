import { faqBodyHtml } from '../../content/render.mjs';
import type { PageContext } from './context';

export function renderFaq(outlet: HTMLElement, ctx: PageContext): void {
  outlet.innerHTML = faqBodyHtml(ctx.links, ctx.lang);
}
