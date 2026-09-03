import { loadDeckIndex } from '../../content/decks';
import { homeBodyHtml, decksGalleryHtml } from '../../content/render.mjs';
import { qs } from '../dom';
import { t } from '../i18n';
import type { PageContext } from './context';

export async function renderHome(outlet: HTMLElement, ctx: PageContext): Promise<void> {
  // The static shell (hero + section head) is shared with the SEO prerender, so
  // it is rendered immediately and only the gallery is filled asynchronously.
  outlet.innerHTML = homeBodyHtml({ links: ctx.links, lang: ctx.lang });
  const gallery = qs('#gallery', outlet)!;

  try {
    const decks = await loadDeckIndex();
    gallery.innerHTML = decksGalleryHtml(decks, ctx.links, { lang: ctx.lang, shareCard: true });
  } catch (e) {
    gallery.innerHTML = `<p class="empty-note">${t('home.loadError')} ${(e as Error).message}</p>`;
  }
}
