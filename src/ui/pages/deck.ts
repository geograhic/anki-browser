import { loadDeckIndex, loadDeckMarkdown, deckBySlug } from '../../content/decks';
import { deckArticleHtml, appLinks } from '../../content/render.mjs';
import { qs } from '../dom';

export async function renderDeck(outlet: HTMLElement, route: { segments: string[] }): Promise<void> {
  const slug = route.segments[1] ?? '';
  outlet.innerHTML = `<div class="container"><div id="deck-body"><div class="spinner"></div></div></div>`;
  const body = qs('#deck-body', outlet)!;

  try {
    const decks = await loadDeckIndex();
    const deck = deckBySlug(decks, slug);
    if (!deck) {
      body.innerHTML = `<p class="empty-note">Deck not found.</p><p><a href="${appLinks.home()}">Back to decks</a></p>`;
      return;
    }
    const md = await loadDeckMarkdown(deck);
    body.innerHTML = deckArticleHtml(deck, md, appLinks);
  } catch (e) {
    body.innerHTML = `<div class="error-note">${(e as Error).message}</div>`;
  }
}
