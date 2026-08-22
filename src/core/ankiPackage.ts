/**
 * Anki package (`.apkg` / `.colpkg`) reader.
 *
 * Both extensions share one container: a ZIP holding a SQLite collection plus
 * numbered media blobs. `.apkg` is a *deck export* (meant for sharing) and
 * `.colpkg` is a *whole-collection backup*. Structurally they are the same, so
 * one reader handles both.
 *
 * Three container generations exist in the wild and all are supported:
 *
 * | `meta`      | collection entry      | payload | media index      |
 * |-------------|-----------------------|---------|------------------|
 * | (absent)    | `collection.anki2`    | plain   | JSON             |
 * | `version:2` | `collection.anki21`   | plain   | JSON             |
 * | `version:3` | `collection.anki21b`  | zstd    | zstd + protobuf  |
 *
 * Orthogonally, the *database schema* is either legacy (v11: notetypes and decks
 * live as JSON inside `col`) or modern (v18: dedicated tables with protobuf
 * config blobs). Old shared decks from AnkiWeb are routinely v11, so both paths
 * are implemented.
 *
 * Reference: Anki `rslib/src/import_export/package/`, `rslib/src/storage/`.
 */
import type { Database } from 'sql.js';
import { ZipArchive } from './zip';
import { isZstd, zstdDecompress } from './zstd';
import { openCollectionDb, queryAll, queryOne, tableExists } from './sqlite';
import { decodeMessage, pbHas, pbString, pbVarint } from './protobuf';
import {
  CARD_TYPE_LEARN,
  CARD_TYPE_NEW,
  CARD_TYPE_RELEARN,
  CARD_TYPE_REVIEW,
  NOTETYPE_CLOZE,
  type Card,
  type CardTemplate,
  type Collection,
  type CollectionStats,
  type Deck,
  type MediaEntry,
  type Note,
  type NoteField,
  type Notetype,
  type PackageVersion,
} from './types';

/** Anki's field separator inside `notes.flds` and nested deck names. */
export const FIELD_SEPARATOR = '\x1f';

export class AnkiPackageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AnkiPackageError';
  }
}

/** Detected container layout. */
interface Container {
  version: PackageVersion;
  collectionEntry: string;
  zstd: boolean;
}

function detectContainer(zip: ZipArchive): Container {
  let version: PackageVersion = 1;
  if (zip.has('meta')) {
    // PackageMetadata { Version version = 1; }
    const meta = decodeMessage(zip.read('meta'));
    const v = pbVarint(meta, 1, 1);
    version = v === 3 ? 3 : v === 2 ? 2 : 1;
  }

  // Trust the actual entries over `meta`: some third-party tools write a v2
  // meta but still ship the modern zstd collection (or vice versa).
  if (zip.has('collection.anki21b')) {
    return { version: 3, collectionEntry: 'collection.anki21b', zstd: true };
  }
  if (zip.has('collection.anki21')) {
    return { version: version === 3 ? 3 : 2, collectionEntry: 'collection.anki21', zstd: false };
  }
  if (zip.has('collection.anki2')) {
    return { version: 1, collectionEntry: 'collection.anki2', zstd: false };
  }
  throw new AnkiPackageError(
    'No Anki collection found in this file. Expected collection.anki21b / collection.anki21 / collection.anki2 — is this really an .apkg or .colpkg export?',
  );
}

/* -------------------------------------------------------------------------- */
/* Notetypes                                                                  */
/* -------------------------------------------------------------------------- */

/** Modern schema (v18+): notetypes / templates / fields tables + protobuf config. */
function readNotetypesModern(db: Database): Map<number, Notetype> {
  const out = new Map<number, Notetype>();

  const ntRows = queryAll<{ id: number; name: string; config: Uint8Array }>(
    db,
    'SELECT id, name, config FROM notetypes',
  );
  for (const row of ntRows) {
    // Notetype.Config { Kind kind = 1; uint32 sort_field_idx = 2; string css = 3; ... }
    const cfg = decodeMessage(row.config);
    out.set(row.id, {
      id: row.id,
      name: row.name,
      css: pbString(cfg, 3),
      isCloze: pbVarint(cfg, 1, 0) === NOTETYPE_CLOZE,
      fields: [],
      templates: [],
    });
  }

  const fieldRows = queryAll<{ ntid: number; ord: number; name: string }>(
    db,
    'SELECT ntid, ord, name FROM fields ORDER BY ntid, ord',
  );
  for (const row of fieldRows) {
    out.get(row.ntid)?.fields.push({ ord: row.ord, name: row.name });
  }

  const tmplRows = queryAll<{ ntid: number; ord: number; name: string; config: Uint8Array }>(
    db,
    'SELECT ntid, ord, name, config FROM templates ORDER BY ntid, ord',
  );
  for (const row of tmplRows) {
    // CardTemplate.Config { string q_format = 1; string a_format = 2; ... }
    const cfg = decodeMessage(row.config);
    out.get(row.ntid)?.templates.push({
      ord: row.ord,
      name: row.name,
      qfmt: pbString(cfg, 1),
      afmt: pbString(cfg, 2),
    });
  }

  return out;
}

/** Legacy schema (v11): everything encoded as JSON in `col.models`. */
function readNotetypesLegacy(modelsJson: string): Map<number, Notetype> {
  const out = new Map<number, Notetype>();
  if (!modelsJson) return out;

  let parsed: Record<string, LegacyModel>;
  try {
    parsed = JSON.parse(modelsJson) as Record<string, LegacyModel>;
  } catch {
    throw new AnkiPackageError('Collection has an unreadable legacy notetype definition (col.models)');
  }

  for (const [key, model] of Object.entries(parsed)) {
    const id = Number(model.id ?? key);
    const fields: NoteField[] = (model.flds ?? [])
      .map((f, i) => ({ ord: f.ord ?? i, name: f.name ?? `Field ${i + 1}` }))
      .sort((a, b) => a.ord - b.ord);
    const templates: CardTemplate[] = (model.tmpls ?? [])
      .map((t, i) => ({
        ord: t.ord ?? i,
        name: t.name ?? `Card ${i + 1}`,
        qfmt: t.qfmt ?? '',
        afmt: t.afmt ?? '',
      }))
      .sort((a, b) => a.ord - b.ord);

    out.set(id, {
      id,
      name: model.name ?? `Notetype ${id}`,
      css: model.css ?? '',
      isCloze: (model.type ?? 0) === NOTETYPE_CLOZE,
      fields,
      templates,
    });
  }
  return out;
}

interface LegacyModel {
  id?: number;
  name?: string;
  css?: string;
  type?: number;
  flds?: { name?: string; ord?: number }[];
  tmpls?: { name?: string; ord?: number; qfmt?: string; afmt?: string }[];
}

/* -------------------------------------------------------------------------- */
/* Decks                                                                      */
/* -------------------------------------------------------------------------- */

function normaliseDeckName(raw: string): string {
  // Modern schema separates nesting with \x1f; legacy JSON already uses "::".
  return raw.split(FIELD_SEPARATOR).join('::');
}

function buildDeck(id: number, rawName: string, filtered: boolean): Deck {
  const name = normaliseDeckName(rawName);
  const parts = name.split('::');
  return {
    id,
    name,
    basename: parts[parts.length - 1] ?? name,
    depth: parts.length - 1,
    filtered,
  };
}

function readDecksModern(db: Database): Deck[] {
  const rows = queryAll<{ id: number; name: string; kind: Uint8Array }>(
    db,
    'SELECT id, name, kind FROM decks',
  );
  return rows
    .map((row) => {
      // DeckKind { oneof kind { Normal normal = 1; Filtered filtered = 2; } }
      let filtered = false;
      try {
        filtered = pbHas(decodeMessage(row.kind), 2);
      } catch {
        filtered = false;
      }
      return buildDeck(row.id, row.name, filtered);
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

function readDecksLegacy(decksJson: string): Deck[] {
  if (!decksJson) return [];
  let parsed: Record<string, { id?: number; name?: string; dyn?: number }>;
  try {
    parsed = JSON.parse(decksJson);
  } catch {
    return [];
  }
  return Object.entries(parsed)
    .map(([key, d]) => buildDeck(Number(d.id ?? key), d.name ?? 'Default', (d.dyn ?? 0) === 1))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/* -------------------------------------------------------------------------- */
/* Media                                                                      */
/* -------------------------------------------------------------------------- */

function readMediaIndex(zip: ZipArchive, container: Container): Map<string, MediaEntry> {
  const out = new Map<string, MediaEntry>();
  if (!zip.has('media')) return out;

  const raw = zip.read('media');
  if (raw.length === 0) return out;

  if (container.version === 3 || isZstd(raw)) {
    // MediaEntries { repeated MediaEntry entries = 1; }
    // MediaEntry { string name = 1; uint32 size = 2; bytes sha1 = 3; }
    // Entry N of the list corresponds to the zip entry literally named "N".
    const plain = zstdDecompress(raw);
    const msg = decodeMessage(plain);
    const entries = msg.get(1) ?? [];
    entries.forEach((field, index) => {
      if (field.wire !== 2) return;
      const name = pbString(decodeMessage(field.bytes), 1);
      if (!name) return;
      const zipEntry = String(index);
      if (zip.has(zipEntry)) out.set(name, { name, zipEntry, zstd: true });
    });
    return out;
  }

  // Legacy: a JSON object mapping zip entry name -> real filename.
  try {
    const map = JSON.parse(new TextDecoder().decode(raw)) as Record<string, string>;
    for (const [zipEntry, name] of Object.entries(map)) {
      if (zip.has(zipEntry)) out.set(name, { name, zipEntry, zstd: false });
    }
  } catch {
    // A malformed media index must never prevent studying the text.
  }
  return out;
}

/* -------------------------------------------------------------------------- */
/* Public API                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * A parsed package: the collection model plus lazy access to media bytes.
 * Call `dispose()` when done to release the SQLite instance.
 */
export class AnkiPackage {
  private readonly mediaCache = new Map<string, Uint8Array>();

  private constructor(
    readonly collection: Collection,
    private readonly zip: ZipArchive,
    private readonly db: Database,
  ) {}

  /** Parse a package from raw bytes. */
  static async open(bytes: Uint8Array): Promise<AnkiPackage> {
    let zip: ZipArchive;
    try {
      zip = ZipArchive.open(bytes);
    } catch (err) {
      throw new AnkiPackageError(
        `Could not read the file as a ZIP archive. Anki packages are ZIP-based; the file may be corrupt or incompletely downloaded. (${(err as Error).message})`,
      );
    }

    const container = detectContainer(zip);

    let dbBytes = zip.read(container.collectionEntry);
    if (container.zstd || isZstd(dbBytes)) dbBytes = zstdDecompress(dbBytes);
    // openCollectionDb patches the buffer in place, so hand it a private copy.
    const db = await openCollectionDb(new Uint8Array(dbBytes));

    const col = queryOne<{ crt: number; ver: number; models: string; decks: string }>(
      db,
      'SELECT crt, ver, models, decks FROM col LIMIT 1',
    );
    if (!col) throw new AnkiPackageError('Collection is missing its `col` metadata row');

    const modern = tableExists(db, 'notetypes') && tableExists(db, 'fields');
    const notetypes = modern
      ? readNotetypesModern(db)
      : readNotetypesLegacy(String(col.models ?? ''));
    const decks =
      modern && tableExists(db, 'decks')
        ? readDecksModern(db)
        : readDecksLegacy(String(col.decks ?? ''));

    const notes = new Map<number, Note>();
    for (const row of queryAll<{ id: number; mid: number; flds: string; tags: string }>(
      db,
      'SELECT id, mid, flds, tags FROM notes',
    )) {
      notes.set(row.id, {
        id: row.id,
        mid: row.mid,
        fields: String(row.flds ?? '').split(FIELD_SEPARATOR),
        tags: String(row.tags ?? '')
          .split(' ')
          .map((t) => t.trim())
          .filter(Boolean),
      });
    }

    const cards = queryAll<Card>(
      db,
      'SELECT id, nid, did, ord, type, queue, due, ivl, factor, reps, lapses FROM cards',
    );

    const collection: Collection = {
      version: container.version,
      crt: Number(col.crt ?? 0),
      schema: Number(col.ver ?? 0),
      decks,
      notetypes,
      notes,
      cards,
      media: readMediaIndex(zip, container),
    };

    return new AnkiPackage(collection, zip, db);
  }

  /** Decompressed bytes for a media filename, or undefined when absent. */
  mediaBytes(filename: string): Uint8Array | undefined {
    const cached = this.mediaCache.get(filename);
    if (cached) return cached;

    const entry = this.collection.media.get(filename);
    if (!entry) return undefined;

    try {
      const raw = this.zip.read(entry.zipEntry);
      const bytes = entry.zstd || isZstd(raw) ? zstdDecompress(raw) : raw;
      this.mediaCache.set(filename, bytes);
      return bytes;
    } catch {
      return undefined;
    }
  }

  /** Aggregate counts for gallery cards and deck pages. */
  stats(): CollectionStats {
    const { cards, notes, decks, notetypes, media } = this.collection;
    let newCount = 0;
    let learnCount = 0;
    let reviewCount = 0;
    for (const card of cards) {
      if (card.type === CARD_TYPE_NEW) newCount++;
      else if (card.type === CARD_TYPE_LEARN || card.type === CARD_TYPE_RELEARN) learnCount++;
      else if (card.type === CARD_TYPE_REVIEW) reviewCount++;
    }
    const tags = new Set<string>();
    for (const note of notes.values()) for (const t of note.tags) tags.add(t);

    return {
      deckCount: decks.filter((d) => !d.filtered).length,
      noteCount: notes.size,
      cardCount: cards.length,
      mediaCount: media.size,
      newCount,
      learnCount,
      reviewCount,
      notetypeNames: [...notetypes.values()].map((n) => n.name).sort(),
      tags: [...tags].sort(),
    };
  }

  dispose(): void {
    this.mediaCache.clear();
    try {
      this.db.close();
    } catch {
      // Already closed — nothing to do.
    }
  }
}
