// Browse-mode sidebar verification.
// Checks: default-open sidebar, click-to-jump, search filter + highlight,
// clear button, keyboard nav, collapse toggle, phone overlay + backdrop.
// Playwright's hit-testing misreports overlap for fixed-overlay + sticky-header
// combos, so clicks use force:true (application-state assertions, not geometry).
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

async function runAt(viewport, label, out) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));

  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.click('a.nav-link[href="#/open"]');
  await page.waitForSelector('#file', { state: 'attached' });
  await page.setInputFiles('#file', apkg);
  await page.waitForSelector('.study-wrap', { timeout: 30000 });
  await page.waitForSelector('.study-sidebar', { timeout: 10000 });
  await page.waitForTimeout(400);

  const isPhone = viewport.width <= 480;
  if (isPhone) {
    const fabVisible = await page.$eval('.sidebar-fab', (n) => getComputedStyle(n).display !== 'none');
    if (!fabVisible) throw new Error(`[${label}] FAB should be visible on phone (sidebar collapsed)`);
    await page.click('.sidebar-fab', { force: true });
    await page.waitForTimeout(350);
  }
  await page.screenshot({ path: root + '/' + out + '-01-default.png' });

  const itemCount = await page.$$eval('.sidebar-item', (l) => l.length);
  if (itemCount < 2) throw new Error(`[${label}] expected >=2 sidebar items, got ${itemCount}`);
  console.log(`[${label}] sidebar items: ${itemCount}`);

  const targetIdx = Math.min(2, itemCount - 1);
  const metaBefore = (await page.$eval('.study-meta', (n) => n.textContent)).trim();
  await page.click(`.sidebar-item[data-index="${targetIdx}"]`, { force: true });
  await page.waitForTimeout(300);
  const metaAfter = (await page.$eval('.study-meta', (n) => n.textContent)).trim();
  if (metaBefore === metaAfter) throw new Error(`[${label}] meta unchanged after click: ${metaAfter}`);
  if (!metaAfter.includes(`Card ${targetIdx + 1}`)) throw new Error(`[${label}] expected meta Card ${targetIdx + 1}, got ${metaAfter}`);
  const activeCount = await page.$$eval('.sidebar-item.is-active', (l) => l.length);
  if (activeCount !== 1) throw new Error(`[${label}] expected exactly 1 active item, got ${activeCount}`);
  console.log(`[${label}] click jump OK: ${metaAfter}`);
  await page.screenshot({ path: root + '/' + out + '-02-clicked.png' });

  // Search filter + highlight + clear button.
  await page.fill('.sidebar-search', 'France');
  await page.waitForTimeout(150);
  const filteredCount = await page.$$eval('.sidebar-item', (l) => l.length);
  const countText = (await page.$eval('.sidebar-count', (n) => n.textContent)).trim();
  console.log(`[${label}] search filtered: ${filteredCount} item(s), count "${countText}"`);
  if (filteredCount < 1) throw new Error(`[${label}] search 'France' should match >=1 card`);
  if (!countText.includes('/')) throw new Error(`[${label}] search count badge missing`);
  const clearVisible = await page.$eval('.sidebar-search-clear', (n) => getComputedStyle(n).display !== 'none');
  if (!clearVisible) throw new Error(`[${label}] clear button not visible while searching`);
  const markCount = await page.$$eval('.sidebar-item mark', (l) => l.length);
  console.log(`[${label}] highlight marks: ${markCount}`);
  if (markCount < 1) throw new Error(`[${label}] search highlight <mark> missing`);

  // Full-text search: a term that lives only in a non-title field must match.
  await page.fill('.sidebar-search', 'Paris');
  await page.waitForTimeout(150);
  const parisCount = await page.$$eval('.sidebar-item', (l) => l.length);
  console.log(`[${label}] full-text search 'Paris' (answer field): ${parisCount} item(s)`);
  if (parisCount < 1) throw new Error(`[${label}] full-text search 'Paris' should match (answer field)`);
  // Cloze content is searchable too: {{c1::sun}} → plain text "sun".
  await page.fill('.sidebar-search', 'sun');
  await page.waitForTimeout(150);
  const sunCount = await page.$$eval('.sidebar-item', (l) => l.length);
  console.log(`[${label}] full-text search 'sun' (cloze): ${sunCount} item(s)`);
  if (sunCount < 1) throw new Error(`[${label}] full-text search 'sun' should match (cloze text)`);

  // Enter jumps to first match; Esc clears.
  await page.press('.sidebar-search', 'Enter');
  await page.waitForTimeout(200);
  const metaOnEnter = (await page.$eval('.study-meta', (n) => n.textContent)).trim();
  console.log(`[${label}] Enter jumped to: ${metaOnEnter}`);
  await page.press('.sidebar-search', 'Escape');
  await page.waitForTimeout(150);
  const searchValue = await page.$eval('.sidebar-search', (n) => n.value);
  if (searchValue !== '') throw new Error(`[${label}] Esc did not clear search`);
  const totalAfterClear = await page.$$eval('.sidebar-item', (l) => l.length);
  if (totalAfterClear !== itemCount) throw new Error(`[${label}] clear should restore ${itemCount} items, got ${totalAfterClear}`);
  console.log(`[${label}] search cleared OK`);

  // Collapse / expand.
  const toggleSel = isPhone ? '.sidebar-close' : '.sidebar-toggle';
  const toggleVisible = await page.$eval(toggleSel, (n) => getComputedStyle(n).display !== 'none');
  if (!toggleVisible) throw new Error(`[${label}] toggle (${toggleSel}) hidden in browse mode`);
  await page.click(toggleSel, { force: true });
  await page.waitForTimeout(400);
  await page.screenshot({ path: root + '/' + out + '-03-collapsed.png' });
  const wCollapsed = await page.$eval('.study-sidebar', (n) => n.getBoundingClientRect().width);
  console.log(`[${label}] sidebar width after collapse: ${wCollapsed}px`);
  if (wCollapsed > 4) throw new Error(`[${label}] sidebar should be hidden (width<=4), got ${wCollapsed}`);
  // Re-open: desktop/tablet via the same toggle; phone via the FAB (the
  // sidebar-close button is hidden inside the collapsed overlay).
  const reopenSel = isPhone ? '.sidebar-fab' : toggleSel;
  await page.click(reopenSel, { force: true });
  await page.waitForTimeout(400);
  const wReopen = await page.$eval('.study-sidebar', (n) => n.getBoundingClientRect().width);
  if (wReopen < 100) throw new Error(`[${label}] sidebar should re-open (>100px), got ${wReopen}`);
  console.log(`[${label}] sidebar reopened OK`);

  // Review mode hides the sidebar controls. On phone the open overlay covers
  // the topbar (backdrop = tap to close list first), so close before switching.
  if (isPhone) {
    await page.locator('.sidebar-backdrop').click({ position: { x: 380, y: 400 }, force: true });
    await page.waitForTimeout(300);
  }
  await page.click('.mode-btn:has-text("Review")', { force: true });
  await page.waitForTimeout(300);
  if (!isPhone) {
    const d = await page.$eval('.sidebar-toggle', (n) => getComputedStyle(n).display);
    if (d !== 'none') throw new Error(`[${label}] topbar toggle should be hidden in Review, got ${d}`);
  }
  const fabInReview = await page.$eval('.sidebar-fab', (n) => getComputedStyle(n).display);
  if (fabInReview !== 'none') throw new Error(`[${label}] FAB should be hidden in Review, got ${fabInReview}`);
  console.log(`[${label}] review mode hides sidebar controls OK`);

  if (isPhone) {
    // Back to Browse: sidebar stays closed (state preserved), FAB is the entry.
    await page.click('.mode-btn:has-text("Browse")', { force: true });
    await page.waitForTimeout(300);
    const fabOnBrowse = await page.$eval('.sidebar-fab', (n) => getComputedStyle(n).display !== 'none');
    if (!fabOnBrowse) throw new Error(`[${label}] phone: FAB should be visible on Browse entry`);
    const backdropBefore = await page.$eval('.sidebar-backdrop', (n) => n.classList.contains('is-active'));
    if (backdropBefore) throw new Error(`[${label}] phone: backdrop should be inactive before opening`);
    // Open via FAB → backdrop active.
    await page.click('.sidebar-fab', { force: true });
    await page.waitForTimeout(300);
    const backdropActive = await page.$eval('.sidebar-backdrop', (n) => n.classList.contains('is-active'));
    if (!backdropActive) throw new Error(`[${label}] phone: backdrop should be active after FAB open`);
    // Tap backdrop edge to close.
    await page.locator('.sidebar-backdrop').click({ position: { x: 380, y: 400 }, force: true });
    await page.waitForTimeout(300);
    const backdropAfterTap = await page.$eval('.sidebar-backdrop', (n) => n.classList.contains('is-active'));
    if (backdropAfterTap) throw new Error(`[${label}] phone: backdrop should drop after tap`);
    const sideRect = await page.$eval('.study-sidebar', (n) => n.getBoundingClientRect().width);
    if (sideRect > 4) throw new Error(`[${label}] phone: sidebar should hide after backdrop tap, width=${sideRect}`);
    const fabBack = await page.$eval('.sidebar-fab', (n) => getComputedStyle(n).display !== 'none');
    if (!fabBack) throw new Error(`[${label}] phone: FAB should reappear after sidebar closed`);
    console.log(`[${label}] phone overlay + backdrop OK`);
  }

  if (errors.length) {
    console.error(`[${label}] console errors:`);
    for (const e of errors) console.error('  -', e);
    throw new Error(`[${label}] ${errors.length} console error(s)`);
  }
  await ctx.close();
}

try {
  await runAt({ width: 1366, height: 900 }, 'desktop', 'verify-sidebar-desktop');
  await runAt({ width: 768, height: 1024 }, 'tablet', 'verify-sidebar-tablet');
  await runAt({ width: 390, height: 844 }, 'phone', 'verify-sidebar-phone');
  console.log('ALL OK');
} catch (e) {
  console.error('FAIL:', e.message);
  process.exitCode = 1;
} finally {
  await browser.close();
}
