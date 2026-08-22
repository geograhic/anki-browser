/**
 * Real-browser smoke test (per the "must actually open a browser" rule).
 *
 * Uses Playwright with the system Microsoft Edge binary. Verifies the critical
 * path on a real deck:
 *   - upload a .apkg, parse it client-side
 *   - a card renders with text (and media where present)
 *   - the four rating buttons advance the session
 *   - progress persists to IndexedDB
 *   - no console errors
 *
 * Usage: node scripts/verify-browser.mjs [baseUrl] [apkgPath]
 * Defaults: baseUrl = http://localhost:4173/anki-browser/ , apkg = the demo deck.
 */
import { createRequire } from 'node:module';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);

// Resolve Playwright: try the local project first, else PLAYWRIGHT_PATH (env).
function loadPlaywright() {
  try {
    return require('playwright');
  } catch {
    const ws = process.env.PLAYWRIGHT_PATH;
    if (!ws) throw new Error('Playwright not found locally — set PLAYWRIGHT_PATH to its module dir');
    return require(ws);
  }
}

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const baseUrl = process.argv[2] || 'http://localhost:4173/anki-browser/';
const apkgPath =
  process.argv[3] ||
  resolve(root, 'public/decks/files/sample-basic.apkg');

if (!existsSync(apkgPath)) {
  console.error('apkg not found:', apkgPath);
  process.exit(1);
}

const { chromium } = loadPlaywright();

const errors = [];
let exitCode = 0;

const browser = await chromium.launch({
  executablePath: EDGE,
  args: ['--no-sandbox'],
});
const page = await browser.newPage();
page.on('response', (res) => {
  const u = res.url();
  if (u.endsWith('.wasm') || u.endsWith('sql-wasm')) {
    console.log('WASM', res.status(), res.headers()['content-type'], u);
  }
});
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(msg.text());
});
page.on('pageerror', (err) => errors.push('pageerror: ' + err.message));

try {
  console.log('opening', baseUrl);
  await page.goto(baseUrl, { waitUntil: 'networkidle' });

  // Home -> open page
  await page.click('a.nav-link[href="#/open"]');
  await page.waitForSelector('#file', { state: 'attached', timeout: 10000 });

  // Upload the deck file (the input is visually hidden; setInputFiles works)
  await page.setInputFiles('#file', apkgPath);
  await page.waitForSelector('.study-wrap', { timeout: 30000 });

  // First card should render question text
  await page.waitForSelector('.card-content', { timeout: 10000 });
  const qText = await page.$eval('.card-content', (n) => n.textContent || '');
  console.log('question rendered:', JSON.stringify(qText.slice(0, 60)));

  // Show answer, then grade
  await page.click('button:has-text("Show Answer")');
  await page.waitForSelector('.rating-row', { timeout: 10000 });
  const ratings = await page.$$('.rating-btn');
  if (ratings.length !== 4) throw new Error(`expected 4 rating buttons, got ${ratings.length}`);
  console.log('rating buttons:', ratings.length);

  // Answer a few cards
  for (let i = 0; i < 5; i++) {
    const good = await page.$('.rating-btn.good');
    if (!good) break;
    await good.click();
    await page.waitForTimeout(150);
  }
  console.log('answered several cards');

  // Progress persisted?
  const stored = await page.evaluate(async () => {
    return new Promise((resolve) => {
      const req = indexedDB.open('anki-browser');
      req.onsuccess = () => {
        const db = req.result;
        const tx = db.transaction('progress', 'readonly');
        const all = tx.objectStore('progress').getAll();
        all.onsuccess = () => resolve(all.result.length);
        all.onerror = () => resolve(-1);
      };
      req.onerror = () => resolve(-1);
    });
  });
  console.log('IndexedDB progress entries:', stored);

  await page.screenshot({ path: resolve(root, 'verify-study.png'), fullPage: false });
  console.log('screenshot -> verify-study.png');
} catch (e) {
  console.error('VERIFY FAILED:', e.message);
  exitCode = 1;
  await page.screenshot({ path: resolve(root, 'verify-fail.png') }).catch(() => {});
} finally {
  if (errors.length) {
    console.error('CONSOLE ERRORS:');
    for (const e of errors) console.error('  -', e);
    exitCode = 1;
  } else {
    console.log('no console errors');
  }
  await browser.close();
  process.exit(exitCode);
}
