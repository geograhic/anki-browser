// One-off diagnostic: open the live URL, log every failed request + console.
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

const url = process.argv[2] || 'https://apps.endril.com/anki-browser/';
const browser = await chromium.launch({ executablePath: EDGE, args: ['--no-sandbox'] });
const page = await browser.newPage();

page.on('response', (res) => {
  if (res.status() >= 400) {
    console.log('FAILED', res.status(), res.url());
  }
});
page.on('requestfailed', (req) => {
  console.log('REQFAILED', req.url(), req.failure()?.errorText);
});
page.on('console', (msg) => {
  console.log('CONSOLE', msg.type(), msg.text().slice(0, 200));
});
page.on('pageerror', (err) => {
  console.log('PAGEERROR', err.message.slice(0, 300));
});

await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 });
await page.waitForTimeout(2000);
const hasNav = await page.$('a.nav-link[href="#/open"]');
console.log('nav-link[#/open] present:', !!hasNav);
const navs = await page.$$eval('a.nav-link', (ns) => ns.map((n) => n.getAttribute('href')));
console.log('nav links:', JSON.stringify(navs));
const bodyText = (await page.evaluate(() => document.body.innerText)).slice(0, 300);
console.log('body text:', JSON.stringify(bodyText));
await page.screenshot({ path: 'live-diag.png' });
console.log('screenshot saved');
await browser.close();
