/**
 * Domain model for an Anki collection.
 *
 * This module is intentionally free of any DOM / browser API so that the whole
 * parsing layer can be unit-tested under Node and reused in a Web Worker.
 */

/** Anki package container version, taken from the `meta` protobuf. */
export type PackageVersion = 1 | 2 | 3;

/** A single field definition belonging to a notetype. */
export interface NoteField {
  ord: number;
  name: string;
}

/** A card template (one per generated card) belonging to a notetype. */
export interface CardTemplate {
  ord: number;
  name: string;
  /** Question format, e.g. `{{Front}}` */
  qfmt: string;
  /** Answer format, e.g. `{{FrontSide}}<hr id=answer>{{Back}}` */
  afmt: string;
}

/** Anki notetype "kind": standard (front/back) or cloze deletion. */
export const NOTETYPE_STANDARD = 0;
export const NOTETYPE_CLOZE = 1;

export interface Notetype {
  id: number;
  name: string;
  /** Styling shared by every template of this notetype. */
  css: string;
  isCloze: boolean;
  fields: NoteField[];
  templates: CardTemplate[];
}

export interface Deck {
  id: number;
  /** Full name; Anki stores nested decks separated by \x1f, normalised here to `::`. */
  name: string;
  /** Leaf name only, e.g. `English` for `Li's Vocabulary::English`. */
  basename: string;
  /** Nesting depth, 0 for a top-level deck. */
  depth: number;
  /** True for filtered decks (Anki "dyn" decks), which we surface read-only. */
  filtered: boolean;
}

export interface Note {
  id: number;
  /** Notetype id. */
  mid: number;
  /** Field values, positionally matching `Notetype.fields`. */
  fields: string[];
  tags: string[];
}

/**
 * Card queue/type constants mirroring Anki's `rslib/src/card.rs`.
 * We only need these to classify a card as new / learning / review.
 */
export const CARD_TYPE_NEW = 0;
export const CARD_TYPE_LEARN = 1;
export const CARD_TYPE_REVIEW = 2;
export const CARD_TYPE_RELEARN = 3;

export interface Card {
  id: number;
  /** Note id. */
  nid: number;
  /** Deck id. */
  did: number;
  /** Template ordinal (for cloze notetypes this is the cloze index). */
  ord: number;
  type: number;
  queue: number;
  /** Days since collection creation (review cards) or position (new cards). */
  due: number;
  /** Current interval in days. */
  ivl: number;
  /** Ease factor, permille (2500 = 250%). */
  factor: number;
  reps: number;
  lapses: number;
}

/** One media file inside the package, resolved lazily. */
export interface MediaEntry {
  /** Real filename as referenced from note fields, e.g. `abc.png`. */
  name: string;
  /** Entry name inside the zip (`0`, `1`, ...). */
  zipEntry: string;
  /** Whether the zip payload is additionally zstd-compressed (package v3). */
  zstd: boolean;
}

/**
 * A fully parsed collection. Media bytes are **not** eagerly loaded; use
 * `MediaResolver` so that a 350 MB backup does not blow up browser memory.
 */
export interface Collection {
  version: PackageVersion;
  /** Collection creation time, unix seconds. Needed to turn `due` into a date. */
  crt: number;
  /** Schema version from `col.ver` (11 = legacy JSON, 18 = modern tables). */
  schema: number;
  decks: Deck[];
  notetypes: Map<number, Notetype>;
  notes: Map<number, Note>;
  cards: Card[];
  /** filename -> media entry */
  media: Map<string, MediaEntry>;
}

/** Aggregate statistics used by the deck gallery and per-deck pages. */
export interface CollectionStats {
  deckCount: number;
  noteCount: number;
  cardCount: number;
  mediaCount: number;
  newCount: number;
  learnCount: number;
  reviewCount: number;
  notetypeNames: string[];
  tags: string[];
}
