import { renderMarkdown, type DeckMeta } from './render.mjs';

const BASE: string = (import.meta as any).env?.BASE_URL ?? '/anki-browser/';

let indexCache: DeckMeta[] | null = null;

export async function loadDeckIndex(): Promise<DeckMeta[]> {
  if (indexCache) return indexCache;
  const res = await fetch(BASE + 'decks/index.json', { cache: 'no-cache' });
  if (!res.ok) throw new Error(`Could not load deck index (${res.status})`);
  indexCache = (await res.json()) as DeckMeta[];
  return indexCache;
}

export async function loadDeckMarkdown(deck: DeckMeta): Promise<string> {
  // Inline `content` (owner-edited via the deck editor) takes priority; the
  // legacy per-deck `markdown` file is still supported as a fallback.
  if (typeof deck.content === 'string' && deck.content.trim()) {
    return renderMarkdown(deck.content);
  }
  if (!deck.markdown) return '';
  const res = await fetch(BASE + 'decks/' + deck.markdown, { cache: 'no-cache' });
  if (!res.ok) return '';
  const md = await res.text();
  return renderMarkdown(md);
}

export function deckBySlug(decks: DeckMeta[], slug: string): DeckMeta | undefined {
  return decks.find((d) => d.slug === slug);
}

export function previewUrl(deck: DeckMeta): string {
  return BASE + deck.previewFile;
}
