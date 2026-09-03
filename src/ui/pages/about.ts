import { aboutBodyHtml } from '../../content/render.mjs';
import type { PageContext } from './context';

export function renderAbout(outlet: HTMLElement, ctx: PageContext): void {
  outlet.innerHTML = aboutBodyHtml(ctx.links, ctx.lang);
}
