import { AnkiPackage, MediaResolver, type Collection } from '../core';

/** The package the user is currently studying (held in memory only). */
export interface Session {
  pkg: AnkiPackage;
  media: MediaResolver;
  collection: Collection;
  /** Human-friendly name, e.g. the uploaded file name. */
  name: string;
  /**
   * A stable fingerprint used as the IndexedDB key so progress survives reloads
   * for the same deck. Not cryptographically strong — just enough to tell two
   * different decks apart.
   */
  deckKey: string;
}

let active: Session | null = null;

export function fingerprint(collection: Collection, name: string): string {
  const firstNote = [...collection.notes.keys()][0] ?? 0;
  return [
    name,
    collection.crt,
    collection.schema,
    collection.cards.length,
    collection.notes.size,
    firstNote,
  ].join('|');
}

export function setSession(s: Session): void {
  if (active && active !== s) active.media.dispose();
  active = s;
}

export function getSession(): Session | null {
  return active;
}

export function clearSession(): void {
  if (active) active.media.dispose();
  active = null;
}
