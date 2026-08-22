// Multi-viewport verification: desktop / tablet / mobile, plus footer sanity.
import { createRequire } from 'node:module';
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

const url = process.argv[2] || 'http://localhost:4173/anki-browser/';
const browser = await chromium.launch({ executablePath: EDGE, args: ['--no-sandbox'] });

const sizes = [
  { name: 'desktop', width: 1280, height: 800 },
  { name: 'tablet',  width: 768,  height: 1024 },
  { name: 'mobile',  width: 390,  height: 844 },
];

for (const s of sizes) {
  const ctx = await browser.newContext({ viewport: { width: s.width, height: s.height } });
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 });
  await page.waitForTimeout(800);

  // Footer sanity: should be ONE centered line, no panel background.
  const footer = await page.evaluate(() => {
    const f = document.querySelector('.site-footer');
    if (!f) return null;
    const cs = getComputedStyle(f);
    const line = f.querySelector('.site-footer-line');
    return {
      bg: cs.backgroundColor,
      borderTop: cs.borderTopWidth + ' ' + cs.borderTopStyle + ' ' + cs.borderTopColor,
      padding: cs.padding,
      textAlign: cs.textAlign,
      lineCount: line ? line.innerHTML.split('<a').length - 1 : -1,
    };
  });
  console.log(`${s.name.padEnd(7)} footer:`, JSON.stringify(footer));

  await page.screenshot({ path: `vp-${s.name}.png`, fullPage: false });
  console.log(`${s.name.padEnd(7)} screenshot saved`);
  await ctx.close();
}

// Also: deck page button order (Baidu primary when only Baidu)
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  await page.goto(url + 'deck/li-vocabulary/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  const btns = await page.$$eval('.deck-actions .btn', (els) =>
    els.map((b) => ({
      text: (b.textContent || '').trim(),
      primary: b.classList.contains('btn-primary'),
      disabled: b.classList.contains('is-disabled'),
    })),
  );
  console.log('li-vocabulary actions:', JSON.stringify(btns));
  await page.screenshot({ path: 'vp-li-vocab.png', fullPage: false });
  await ctx.close();
}

await browser.close();
console.log('all viewport checks done');