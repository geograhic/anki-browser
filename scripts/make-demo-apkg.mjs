/**
 * Build a tiny, valid Anki `.apkg` (legacy v11 collection) used as a bundled
 * demo deck so visitors can try the reviewer instantly, and as an extra
 * regression fixture. Written with sql.js (SQLite WASM in Node) + fflate.
 */
import initSqlJs from 'sql.js';
import { zipSync } from 'fflate';
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const wasmDir = resolve(root, 'node_modules/sql.js/dist');
const outPath = resolve(root, 'public/decks/files/sample-basic.apkg');

const SQL = await initSqlJs({ locateFile: (f) => resolve(wasmDir, f) });
const db = new SQL.Database();

db.run(`
  CREATE TABLE col (id integer primary key, crt integer, mod integer, scm integer,
    ver integer, dty integer, usn integer, ls integer, conf text, models text,
    decks text, dconf text, tags text);
  CREATE TABLE notes (id integer primary key, guid text, mid integer, mod integer,
    usn integer, flds text, sfld text, tags text, flags integer, data text);
  CREATE TABLE cards (id integer primary key, nid integer, did integer, ord integer,
    mod integer, usn integer, type integer, queue integer, due integer, ivl integer,
    factor integer, reps integer, lapses integer, left integer, odue integer,
    odid integer, flags integer, data text);
`);

const SEP = '';
const crt = Math.floor(Date.now() / 1000);

const models = {
  '1000': {
    id: 1000,
    name: 'Basic',
    type: 0,
    css: '',
    flds: [
      { name: 'Front', ord: 0 },
      { name: 'Back', ord: 1 },
    ],
    tmpls: [
      { name: 'Card 1', ord: 0, qfmt: '{{Front}}', afmt: '{{FrontSide}}<hr id=answer>{{Back}}' },
    ],
  },
  '1001': {
    id: 1001,
    name: 'Cloze',
    type: 1,
    css: '',
    flds: [
      { name: 'Text', ord: 0 },
      { name: 'Extra', ord: 1 },
    ],
    tmpls: [
      { name: 'Cloze', ord: 0, qfmt: '{{cloze:Text}}', afmt: '{{cloze:Text}}<hr id=answer>{{Extra}}' },
    ],
  },
};

const decks = { '1': { id: 1, name: 'Sample Deck', desc: '', dyn: 0 } };

db.run(
  'INSERT INTO col (id, crt, mod, scm, ver, dty, usn, ls, conf, models, decks, dconf, tags) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)',
  [1, crt, crt, crt, 11, 0, 0, 0, '{}', JSON.stringify(models), JSON.stringify(decks), '{}', ''],
);

const notes = [
  { id: 1, mid: 1000, flds: ['Capital of France', 'Paris'], tags: 'demo basic' },
  { id: 2, mid: 1000, flds: ['2 + 2', '4'], tags: 'demo' },
  { id: 3, mid: 1001, flds: ['The {{c1::sun}} rises in the {{c2::east}}.', 'A star.'], tags: 'demo cloze' },
  { id: 4, mid: 1000, flds: ['Embedded image', '<img src="sample.png"> A small picture.'], tags: 'demo media' },
];

const cards = [
  { id: 1, nid: 1, ord: 0 },
  { id: 2, nid: 2, ord: 0 },
  { id: 3, nid: 3, ord: 0 }, // cloze 1
  { id: 4, nid: 3, ord: 1 }, // cloze 2
  { id: 5, nid: 4, ord: 0 },
];

function guid() {
  return Math.random().toString(36).slice(2, 12);
}

for (const n of notes) {
  db.run(
    'INSERT INTO notes (id, guid, mid, mod, usn, flds, sfld, tags, flags, data) VALUES (?,?,?,?,?,?,?,?,?,?)',
    [n.id, guid(), n.mid, crt, 0, n.flds.join(SEP), n.flds[0], n.tags, 0, ''],
  );
}

for (const c of cards) {
  db.run(
    'INSERT INTO cards (id, nid, did, ord, mod, usn, type, queue, due, ivl, factor, reps, lapses, left, odue, odid, flags, data) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
    [c.id, c.nid, 1, c.ord, crt, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, ''],
  );
}

const collectionBytes = db.export();
db.close();

// A tiny 2x2 red PNG for the embedded-image note.
const pngB64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAEUlEQVR4nGNk+M9Qz0BkYAQAJUcC/4l1Hw0AAAAASUVORK5CYII=';
const pngBytes = Buffer.from(pngB64, 'base64');

const media = JSON.stringify({ 0: 'sample.png' });

const apkg = zipSync({
  'collection.anki2': new Uint8Array(collectionBytes),
  media: new TextEncoder().encode(media),
  '0': new Uint8Array(pngBytes),
});

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, apkg);
console.log('wrote demo apkg ->', outPath, `(${apkg.length} bytes)`);
