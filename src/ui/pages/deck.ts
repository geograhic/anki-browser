import { loadDeckIndex, loadDeckMarkdown, deckBySlug } from '../../content/decks';
import { deckArticleHtml } from '../../content/render.mjs';
import { qs } from '../dom';
import { t } from '../i18n';
import type { PageContext } from './context';

export async function renderDeck(outlet: HTMLElement, ctx: PageContext): Promise<void> {
  // Deck pages exist at a single, language-neutral URL; only the surrounding
  // interface follows the visitor's language. The deck content itself is shown
  // exactly as its author wrote it.
  const slug = ctx.segments[1] ?? '';
  outlet.innerHTML = `<div class="container"><div id="deck-body"><div class="spinner"></div></div></div>`;
  const body = qs('#deck-body', outlet)!;

  try {
    const decks = await loadDeckIndex();
    const deck = deckBySlug(decks, slug);
    if (!deck) {
      body.innerHTML = `<p class="empty-note">${t('common.error')}</p><p><a href="${ctx.links.home()}">${t(
        'common.backHome',
      )}</a></p>`;
      return;
    }
    const md = await loadDeckMarkdown(deck);
    body.innerHTML = deckArticleHtml(deck, md, ctx.links, ctx.lang);
  } catch (e) {
    body.innerHTML = `<div class="error-note">${(e as Error).message}</div>`;
  }
}
