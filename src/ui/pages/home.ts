import { loadDeckIndex } from '../../content/decks';
import { decksGalleryHtml, heroHtml, appLinks } from '../../content/render.mjs';
import { qs } from '../dom';

export async function renderHome(outlet: HTMLElement): Promise<void> {
  outlet.innerHTML = `
    ${heroHtml(appLinks)}
    <section class="section">
      <div class="container">
        <div class="section-head"><h2>Shared decks</h2></div>
        <div id="gallery"><div class="spinner"></div></div>
      </div>
    </section>`;

  const gallery = qs('#gallery', outlet)!;
  try {
    const decks = await loadDeckIndex();
    gallery.innerHTML = decksGalleryHtml(decks, appLinks);
  } catch (e) {
    gallery.innerHTML = `<p class="empty-note">Could not load the deck list. ${(e as Error).message}</p>`;
  }
}
