// Browse-mode verification: open demo deck, switch to Browse, flip cards.
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);

function loadPlaywright() {
  try {
    return require('playwright');
  } catch {
    const ws = process.env.PLAYWRIGHT_PATH;
    if (!ws) throw new Error('Playwright not found locally — set PLAYWRIGHT_PATH to its module dir');
    return require(ws);
  }
}
const { chromium } = loadPlaywright();
const EDGE = process.env.EDGE_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const baseUrl = process.argv[2] || 'http://localhost:4173/anki-browser/';
const apkg = root + '/public/decks/files/sample-basic.apkg';
const browser = await chromium.launch({ executablePath: EDGE, args: ['--no-sandbox'] });
const page = await browser.newPage();
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));

try {
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.click('a.nav-link[href="#/open"]');
  await page.waitForSelector('#file', { state: 'attached' });
  await page.setInputFiles('#file', apkg);
  await page.waitForSelector('.study-wrap', { timeout: 30000 });
  await page.waitForSelector('.card-content', { timeout: 10000 });

  // Review mode first (default): Show Answer + ratings
  await page.click('button:has-text("Show Answer")');
  await page.waitForSelector('.rating-btn', { timeout: 5000 });
  console.log('review mode: rating buttons OK');
  await page.click('button:has-text("Good")');
  await page.waitForTimeout(200);

  // Switch to Browse
  await page.click('.mode-btn:has-text("Browse")');
  await page.waitForTimeout(300);
  const meta1 = (await page.$eval('.study-meta', (n) => n.textContent)).trim();
  console.log('browse meta:', meta1);
  if (!/Card 1 \/ \d+ · Browse/.test(meta1)) throw new Error('unexpected browse meta: ' + meta1);

  const prevDisabled = await page.$eval('.browse-nav:has-text("Prev")', (n) => n.disabled);
  const nextDisabled = await page.$eval('.browse-nav:has-text("Next")', (n) => n.disabled);
  console.log('first card: prev disabled =', prevDisabled, ', next disabled =', nextDisabled);
  if (!prevDisabled || nextDisabled) throw new Error('prev/next disabled state wrong');

  // Show answer in browse mode
  await page.click('button:has-text("Show Answer")');
  await page.waitForTimeout(200);
  const hasAnswer = await page.$eval('.card-content', (n) => n.textContent.length > 0);
  console.log('browse show answer rendered:', hasAnswer);

  // Flip through all cards
  const total = parseInt(meta1.match(/\/ (\d+) ·/)[1], 10);
  for (let i = 0; i < total - 1; i++) {
    await page.click('.browse-nav:has-text("Next")');
    await page.waitForTimeout(120);
  }
  const metaLast = (await page.$eval('.study-meta', (n) => n.textContent)).trim();
  console.log('last card meta:', metaLast);
  const lastNextDisabled = await page.$eval('.browse-nav:has-text("Next")', (n) => n.disabled);
  if (!lastNextDisabled) throw new Error('Next should be disabled on last card');
  console.log('last card: Next disabled =', lastNextDisabled);

  // Back to Review mode still works
  await page.click('.mode-btn:has-text("Review")');
  await page.waitForTimeout(300);
  const metaR = (await page.$eval('.study-meta', (n) => n.textContent)).trim();
  console.log('back to review meta:', metaR);
  await page.screenshot({ path: root + '/verify-browse.png', fullPage: false });
  console.log('screenshot -> verify-browse.png');

  if (errors.length) {
    console.error('CONSOLE ERRORS:');
    for (const e of errors) console.error('  -', e);
    process.exit(1);
  }
  console.log('BROWSE MODE OK, no console errors');
} catch (e) {
  console.error('BROWSE VERIFY FAILED:', e.message);
  process.exit(1);
} finally {
  await browser.close();
}
