import type { CardState } from '../core';

/**
 * Local-only progress store (IndexedDB).
 *
 * Review state never leaves the browser and is never written back into the
 * `.apkg`. Each deck is keyed by its fingerprint (see `state.ts`), so progress
 * for a given file persists across reloads on the same device.
 *
 * We also persist the bytes of the most recently opened file so a page reload
 * (or any in-app navigation) does not lose the user's open deck — the file is
 * only discarded when another file is opened or the user clears site data.
 */

const DB_NAME = 'anki-browser';
const STORE = 'progress';
const SESSION_STORE = 'session';
const LAST_FILE_KEY = 'last';
const VERSION = 2;

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains(SESSION_STORE)) {
        db.createObjectStore(SESSION_STORE, { keyPath: 'key' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

interface StoredProgress {
  key: string;
  states: CardState[];
  updated: number;
}

/** The persisted copy of the most recently opened deck file. */
export interface LastFile {
  key: string;
  /** Original file name, e.g. "Li's Vocabulary.apkg". */
  name: string;
  /** Raw file bytes; enough to re-parse the deck on reload. */
  bytes: Uint8Array;
  updated: number;
}

export async function loadStates(key: string): Promise<CardState[]> {
  try {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get(key);
      req.onsuccess = () => {
        const row = req.result as StoredProgress | undefined;
        resolve(row?.states ?? []);
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

export async function saveStates(key: string, states: CardState[]): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put({ key, states, updated: Date.now() } as StoredProgress);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // Storage may be unavailable (private mode); studying still works in-memory.
  }
}

export async function clearStates(key: string): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    /* ignore */
  }
}

/* ------------------- Last-opened-file persistence ------------------- */

/** Persist the opened file so a reload / in-app navigation keeps it. */
export async function saveLastFile(name: string, bytes: Uint8Array): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(SESSION_STORE, 'readwrite');
      tx.objectStore(SESSION_STORE).put({ key: LAST_FILE_KEY, name, bytes, updated: Date.now() } as LastFile);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // Non-fatal: the session still lives in memory for this page load.
  }
}

/** Load the most recently opened file, or null if none was persisted. */
export async function loadLastFile(): Promise<{ name: string; bytes: Uint8Array } | null> {
  try {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(SESSION_STORE, 'readonly');
      const req = tx.objectStore(SESSION_STORE).get(LAST_FILE_KEY);
      req.onsuccess = () => {
        const row = req.result as LastFile | undefined;
        resolve(row ? { name: row.name, bytes: row.bytes } : null);
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

/** Drop the persisted file (e.g. the user explicitly chose to forget it). */
export async function clearLastFile(): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(SESSION_STORE, 'readwrite');
      tx.objectStore(SESSION_STORE).delete(LAST_FILE_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    /* ignore */
  }
}
