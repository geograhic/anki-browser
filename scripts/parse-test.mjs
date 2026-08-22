/**
 * End-to-end validation of the parsing core against real Anki exports.
 *
 * Runs entirely in Node: bundles `src/core` with esbuild, feeds it actual
 * `.apkg` / `.colpkg` files and asserts that decks, notetypes, templates, notes,
 * cards, media and card rendering all come out correct. This is the fast
 * feedback loop; `verify-browser.mjs` then proves the same code path works in a
 * real browser.
 *
 * Usage:
 *   node scripts/parse-test.mjs [extra-package-file ...]
 */
import { build } from 'esbuild';
import { readFileSync, existsSync, mkdirSync, writeFileSync, statSync } from 'node:fs';
import { dirname, join, resolve, basename } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');

/** Real exports from the maintainer's Anki archive; skipped when absent. */
const ARCHIVE = 'C:/Users/LJL/Li_System/Personal_Core/BaiduSyncdisk/Core_Auxiliary/Book_Repository/20260520_DL03_Anki_Cloud_Archive';
const DEFAULT_SAMPLES = [
  `${ARCHIVE}/Li's Vocabulary-20251229200100_标本.apkg`,
  `${ARCHIVE}/Li's Vocabulary-20260204154204_标本.apkg`,
  `${ARCHIVE}/collection-20260520163312_标本.colpkg`,
];

let failures = 0;
let checks = 0;

function check(label, condition, detail = '') {
  checks++;
  if (condition) {
    console.log(`   PASS  ${label}${detail ? ` — ${detail}` : ''}`);
  } else {
    failures++;
    console.log(`   FAIL  ${label}${detail ? ` — ${detail}` : ''}`);
  }
}

async function bundleCore() {
  const outfile = join(root, '.cache', 'core.bundle.mjs');
  mkdirSync(dirname(outfile), { recursive: true });
  await build({
    entryPoints: [join(root, 'src', 'core', 'index.ts')],
    bundle: true,
    format: 'esm',
    platform: 'node',
    target: 'node20',
    outfile,
    external: ['sql.js'],
    logLevel: 'warning',
  });
  return outfile;
}

function formatBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

async function main() {
  console.log('Bundling core with esbuild...');
  const bundlePath = await bundleCore();
  const core = await import(pathToFileURL(bundlePath).href);

  // sql.js in Node: hand it the wasm bytes directly, which avoids any
  // locateFile/path resolution differences between platforms.
  const wasmBinary = readFileSync(join(root, 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm'));
  core.configureSqlite({ wasmBinary });

  const extra = process.argv.slice(2);
  const samples = [...DEFAULT_SAMPLES, ...extra].filter((p) => {
    if (existsSync(p)) return true;
    console.log(`\n(skip, not found) ${p}`);
    return false;
  });

  if (samples.length === 0) {
    console.log('\nNo sample packages available — nothing to validate.');
    process.exit(1);
  }

  // --- unit-level checks that need no package file -------------------------
  console.log('\n=== Unit: cloze parsing ===');
  const nested = 'The {{c1::quick {{c2::brown}} fox}} jumps';
  const clozes = core.findClozes(nested);
  check('nested cloze finds 1 top-level match', clozes.length === 1, `got ${clozes.length}`);
  check('top-level ordinal is 1', clozes[0]?.ordinal === 1);
  check(
    'question hides active cloze',
    core.renderCloze(nested, 1, 'question').includes('[...]'),
  );
  check(
    'inactive cloze shows its text',
    core.renderCloze(nested, 1, 'question').includes('jumps'),
  );
  const hinted = 'Capital: {{c1::Paris::city}}';
  check(
    'cloze hint is rendered',
    core.renderCloze(hinted, 1, 'question').includes('[city]'),
    core.renderCloze(hinted, 1, 'question'),
  );
  check(
    'answer side reveals cloze text',
    core.renderCloze(hinted, 1, 'answer').includes('Paris'),
  );

  console.log('\n=== Unit: template conditionals & filters ===');
  const nt = {
    id: 1,
    name: 'T',
    css: '',
    isCloze: false,
    fields: [
      { ord: 0, name: 'Front' },
      { ord: 1, name: 'Back' },
      { ord: 2, name: 'Extra' },
    ],
    templates: [
      {
        ord: 0,
        name: 'Card 1',
        qfmt: '{{Front}}{{#Extra}} [has extra]{{/Extra}}{{^Extra}} [no extra]{{/Extra}}',
        afmt: '{{FrontSide}}<hr id=answer>{{Back}}{{#Extra}}<div>{{text:Extra}}</div>{{/Extra}}',
      },
    ],
  };
  const note = { id: 1, mid: 1, fields: ['Hello', '<b>World</b>', ''], tags: ['x'] };
  const card = { id: 1, nid: 1, did: 1, ord: 0, type: 0, queue: 0, due: 0, ivl: 0, factor: 0, reps: 0, lapses: 0 };
  const rendered = core.renderCard({ note, notetype: nt, card, deckName: 'D' });
  check('negated conditional fires on empty field', rendered.question.html.includes('[no extra]'));
  check('positive conditional suppressed on empty field', !rendered.question.html.includes('[has extra]'));
  check('{{FrontSide}} expands on the answer', rendered.answer.html.includes('Hello'));
  check('answer keeps field HTML', rendered.answer.html.includes('<b>World</b>'));

  const note2 = { ...note, fields: ['Hello', 'World', '<i>note</i>'] };
  const rendered2 = core.renderCard({ note: note2, notetype: nt, card, deckName: 'D' });
  check('positive conditional fires when filled', rendered2.question.html.includes('[has extra]'));
  check('{{text:}} strips HTML', rendered2.answer.html.includes('<div>note</div>'));

  console.log('\n=== Unit: SM-2 scheduler ===');
  const cfg = core.DEFAULT_SCHEDULER_CONFIG;
  const now = Date.UTC(2026, 0, 1);
  let st = core.initialState(card, cfg, now);
  check('new card starts in "new" phase', st.phase === 'new');
  const good1 = core.answerCard(st, core.RATING_GOOD, cfg, now);
  check('Good on new -> learning', good1.state.phase === 'learning', good1.state.phase);
  check('Good on new schedules ~10m', Math.round(good1.delayMs / 60000) === 10, `${good1.delayMs / 60000}m`);
  const good2 = core.answerCard(good1.state, core.RATING_GOOD, cfg, now);
  check('Good again graduates to review', good2.state.phase === 'review', good2.state.phase);
  const again = core.answerCard(good2.state, core.RATING_AGAIN, cfg, now);
  check('Again on review -> relearning', again.state.phase === 'relearning');
  check('Again increments lapses', again.state.lapses === 1);
  check('Again reduces ease', again.state.factor < good2.state.factor);
  const reviewState = { ...good2.state, phase: 'review', intervalDays: 10, factor: 2500 };
  const easy = core.answerCard(reviewState, core.RATING_EASY, cfg, now);
  check('Easy grows interval beyond Good', easy.state.intervalDays > 10, `${easy.state.intervalDays}d`);
  check('formatDelay is human readable', core.formatDelay(86400000 * 45).endsWith('mo'), core.formatDelay(86400000 * 45));

  // --- package-level checks ------------------------------------------------
  for (const file of samples) {
    const size = statSync(file).size;
    console.log(`\n=== Package: ${basename(file)} (${formatBytes(size)}) ===`);
    const started = Date.now();
    const bytes = new Uint8Array(readFileSync(file));
    let pkg;
    try {
      pkg = await core.AnkiPackage.open(bytes);
    } catch (err) {
      failures++;
      console.log(`   FAIL  could not open package — ${err.message}`);
      continue;
    }
    const elapsed = Date.now() - started;
    const { collection } = pkg;
    const stats = pkg.stats();

    console.log(
      `   parsed in ${elapsed} ms | container v${collection.version} | schema v${collection.schema}`,
    );
    console.log(
      `   decks=${stats.deckCount} notes=${stats.noteCount} cards=${stats.cardCount} media=${stats.mediaCount} notetypes=${stats.notetypeNames.length}`,
    );
    console.log(`   card states: new=${stats.newCount} learn=${stats.learnCount} review=${stats.reviewCount}`);
    if (collection.decks.length) {
      console.log(`   deck names: ${collection.decks.slice(0, 5).map((d) => d.name).join(' | ')}`);
    }

    check('has at least one note', stats.noteCount > 0);
    check('has at least one card', stats.cardCount > 0);
    check('has at least one notetype', collection.notetypes.size > 0);
    check('has at least one deck', collection.decks.length > 0);
    check('collection creation time is sane', collection.crt > 1_000_000_000, String(collection.crt));

    // Every notetype must expose fields and templates, else rendering is impossible.
    let ntOk = true;
    let tmplOk = true;
    for (const n of collection.notetypes.values()) {
      if (n.fields.length === 0) ntOk = false;
      if (n.templates.length === 0) tmplOk = false;
      else if (!n.templates.some((t) => t.qfmt.trim().length > 0)) tmplOk = false;
    }
    check('every notetype has fields', ntOk);
    check('every notetype has a non-empty question template', tmplOk);

    // Render a sample of cards and confirm we produce real content.
    const byId = collection.notes;
    let renderedOk = 0;
    let renderedEmpty = 0;
    const warnings = new Set();
    const sample = collection.cards.slice(0, 60);
    for (const c of sample) {
      const n = byId.get(c.nid);
      if (!n) continue;
      const notetype = collection.notetypes.get(n.mid);
      if (!notetype) continue;
      const deck = collection.decks.find((d) => d.id === c.did);
      const out = core.renderCard({
        note: n,
        notetype,
        card: c,
        deckName: deck?.name ?? 'Default',
      });
      for (const w of [...out.question.warnings, ...out.answer.warnings]) warnings.add(w);
      const text = core.stripHtml(out.question.html);
      if (text.length > 0) renderedOk++;
      else renderedEmpty++;
    }
    check(
      `rendered ${renderedOk}/${sample.length} sampled questions with visible text`,
      renderedOk > 0 && renderedEmpty === 0,
      renderedEmpty ? `${renderedEmpty} empty` : '',
    );
    if (warnings.size) {
      console.log(`   template warnings: ${[...warnings].slice(0, 5).join(' ; ')}`);
    }

    // Media: pull a few files and confirm the bytes look like real media.
    const mediaNames = [...collection.media.keys()];
    if (mediaNames.length > 0) {
      let mediaOk = 0;
      for (const name of mediaNames.slice(0, 8)) {
        const b = pkg.mediaBytes(name);
        if (b && b.length > 0) mediaOk++;
      }
      check(
        `extracted ${mediaOk}/${Math.min(8, mediaNames.length)} media files`,
        mediaOk === Math.min(8, mediaNames.length),
      );
      const first = pkg.mediaBytes(mediaNames[0]);
      const isPng = first && first[0] === 0x89 && first[1] === 0x50;
      const isJpg = first && first[0] === 0xff && first[1] === 0xd8;
      const isAudio = first && (first[0] === 0x49 || first[0] === 0xff || first[0] === 0x4f);
      check('first media file has a recognisable header', Boolean(isPng || isJpg || isAudio), mediaNames[0]);
    } else {
      console.log('   (no media in this package)');
    }

    // Scheduler integration: build a queue from real cards.
    const states = collection.cards.map((c) => core.initialState(c, cfg, Date.now()));
    const queue = core.buildQueue(states, {
      config: cfg,
      now: Date.now(),
      introducedToday: 0,
      reviewedToday: 0,
    });
    const counts = core.queueCounts(states, Date.now());
    check('queue is non-empty', queue.length > 0, `queue=${queue.length}`);
    check(
      'queue respects the daily new-card cap',
      queue.filter((s) => s.phase === 'new').length <= cfg.newPerDay,
    );
    console.log(`   queue: ${queue.length} cards (new=${counts.new} learn=${counts.learning} review=${counts.review})`);

    pkg.dispose();
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`${checks - failures}/${checks} checks passed`);
  if (failures > 0) {
    console.log(`${failures} FAILURE(S)`);
    process.exit(1);
  }
  console.log('All checks passed.');

  // Leave a machine-readable summary for CI / later inspection.
  writeFileSync(
    join(root, '.cache', 'parse-test-report.json'),
    JSON.stringify({ checks, failures, samples, ranAt: new Date().toISOString() }, null, 2),
  );
}

main().catch((err) => {
  console.error('\nparse-test crashed:', err);
  process.exit(1);
});
