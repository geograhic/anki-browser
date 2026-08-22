/**
 * SQLite access layer (sql.js / SQLite compiled to WASM).
 *
 * ## The `unicase` problem
 *
 * Anki's Rust backend registers a custom SQLite collation called `unicase`
 * (Unicode-aware case-insensitive) and *declares it in the schema*:
 *
 *     CREATE TABLE fields (..., name text NOT NULL COLLATE unicase, ...) without rowid
 *
 * A stock SQLite build has no such collation, so it refuses to even *prepare* a
 * statement against those tables:
 *
 *     Error: no such collation sequence: unicase
 *
 * This is fatal, not cosmetic: `fields` is a WITHOUT ROWID table, so its primary
 * key index *is* the table and every read needs the collation. `NOT INDEXED`
 * does not help. Without `fields` we cannot map note field values to template
 * placeholders, i.e. we could not render a single card.
 *
 * Registering a collation is not exposed by sql.js's JS API, and shipping a
 * custom SQLite build just for this would be a maintenance burden. Instead we
 * rewrite the schema text in the raw database bytes *before* opening it,
 * swapping `unicase` for SQLite's built-in `nocase`. Both tokens are 7 bytes
 * (`nocase ` keeps the length with a trailing space), so every page offset,
 * b-tree pointer and payload length stays byte-identical — `PRAGMA
 * integrity_check` returns `ok` afterwards (verified against real exports).
 *
 * The only semantic difference is that `nocase` case-folds ASCII only. Since
 * this app opens collections strictly read-only and never relies on Anki's exact
 * sort order, that is immaterial.
 */
import initSqlJs from 'sql.js';
import type { Database, SqlJsStatic, SqlValue } from 'sql.js';

/** Runtime-supplied locator for `sql-wasm.wasm` (differs browser vs Node). */
export type SqliteInitOptions = Parameters<typeof initSqlJs>[0];

let initOptions: SqliteInitOptions;
let sqlPromise: Promise<SqlJsStatic> | null = null;

/** Configure how the WASM binary is located. Must be called before `getSqlJs`. */
export function configureSqlite(options: SqliteInitOptions): void {
  initOptions = options;
  sqlPromise = null;
}

/** Lazily initialise (and cache) the SQLite WASM runtime. */
export function getSqlJs(): Promise<SqlJsStatic> {
  if (!sqlPromise) sqlPromise = initSqlJs(initOptions);
  return sqlPromise;
}

const COLLATE_PREFIX = 'COLLATE ';
const NEEDLE = 'unicase';
const REPLACEMENT = 'nocase '; // same byte length as NEEDLE

/**
 * Replace `COLLATE unicase` with `COLLATE nocase ` in-place.
 *
 * Only occurrences directly preceded by `COLLATE ` (case-insensitive) are
 * touched, so a note that happens to contain the word "unicase" is left alone.
 *
 * @returns number of patched occurrences.
 */
export function patchUnicaseCollation(bytes: Uint8Array): number {
  const needle = new TextEncoder().encode(NEEDLE);
  const replacement = new TextEncoder().encode(REPLACEMENT);
  const prefix = COLLATE_PREFIX.toLowerCase();
  let patched = 0;

  outer: for (let i = 0; i + needle.length <= bytes.length; i++) {
    for (let j = 0; j < needle.length; j++) {
      if (bytes[i + j] !== needle[j]) continue outer;
    }
    // Verify the `COLLATE ` prefix, case-insensitively.
    const start = i - prefix.length;
    if (start < 0) continue;
    for (let k = 0; k < prefix.length; k++) {
      const ch = bytes[start + k];
      const lower = ch >= 65 && ch <= 90 ? ch + 32 : ch;
      if (lower !== prefix.charCodeAt(k)) continue outer;
    }
    bytes.set(replacement, i);
    patched++;
  }
  return patched;
}

/**
 * Open an Anki collection database from raw bytes.
 * The input buffer is mutated by the collation patch, so pass a private copy.
 */
export async function openCollectionDb(bytes: Uint8Array): Promise<Database> {
  patchUnicaseCollation(bytes);
  const SQL = await getSqlJs();
  return new SQL.Database(bytes);
}

/** Run a query and return rows as plain objects. */
export function queryAll<T = Record<string, SqlValue>>(
  db: Database,
  sql: string,
  params?: SqlValue[],
): T[] {
  const stmt = db.prepare(sql);
  try {
    if (params) stmt.bind(params);
    const rows: T[] = [];
    while (stmt.step()) rows.push(stmt.getAsObject() as unknown as T);
    return rows;
  } finally {
    stmt.free();
  }
}

/** Run a query expected to yield at most one row. */
export function queryOne<T = Record<string, SqlValue>>(
  db: Database,
  sql: string,
  params?: SqlValue[],
): T | undefined {
  return queryAll<T>(db, sql, params)[0];
}

/** True when the given table exists in the collection. */
export function tableExists(db: Database, name: string): boolean {
  const row = queryOne<{ n: number }>(
    db,
    "SELECT count(*) AS n FROM sqlite_master WHERE type='table' AND name=?",
    [name],
  );
  return (row?.n ?? 0) > 0;
}
