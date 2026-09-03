/**
 * Deploy the anki-browser-api Cloudflare Worker via the REST API.
 *
 * Assembles the worker source from ONE source of truth:
 *
 *     src/content/pages.mjs     (licence list)          ┐ stripped of `export`
 *     src/content/validate.mjs  (submission validation) ┘ and inlined
 *     worker/api.js             (routing / OAuth / GitHub / sessions)
 *
 * so the browser and the server can never disagree about the submission rules.
 *
 * Required environment variables
 * ------------------------------
 *   CF_API_TOKEN     Cloudflare token with Workers Scripts:Edit + Zone Workers Routes:Edit
 *   CF_ACCOUNT_ID    Cloudflare account id
 *   CF_ZONE_ID       zone id of endril.com
 *   GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET   OAuth app credentials
 *   BOT_TOKEN        fine-grained PAT: issues RW on the submissions repo,
 *                    contents RW on the main repo
 *   SESSION_SECRET   random string used to sign session cookies
 *   ADMIN_LOGINS     comma-separated GitHub logins allowed to moderate
 * Optional:
 *   PUBLIC_ORIGIN (default https://apps.endril.com)
 *   SUBMISSIONS_REPO (default geograhic/anki-browser-submissions)
 *   MAIN_REPO (default geograhic/anki-browser)
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function requiredEnv(name) {
  const v = process.env[name];
  if (!v) {
    console.error(`Missing required env var: ${name}`);
    process.exit(1);
  }
  return v;
}

const CF_API_TOKEN = requiredEnv('CF_API_TOKEN');
const CF_ACCOUNT_ID = requiredEnv('CF_ACCOUNT_ID');
const CF_ZONE_ID = requiredEnv('CF_ZONE_ID');
const SCRIPT_NAME = process.env.WORKER_NAME || 'anki-browser-api';
const ROUTE_PATTERN = process.env.WORKER_ROUTE || 'apps.endril.com/anki-browser/api/*';

/** Strip module syntax so shared JS can be inlined into the classic worker. */
function inlineShared(relPath) {
  const src = readFileSync(resolve(root, relPath), 'utf8');
  return src
    .replace(/^import\s+[\s\S]*?from\s+'[^']*';\s*$/gm, '') // drop imports
    .replace(/^export\s+/gm, ''); // export const x  ->  const x
}

const pages = inlineShared('src/content/pages.mjs');
const validate = inlineShared('src/content/validate.mjs');
const handler = readFileSync(resolve(root, 'worker/api.js'), 'utf8');

// The worker body must not re-declare what the shared modules already provide.
if (/sanitizeSubmission/.test(handler) && !/function sanitizeSubmission/.test(handler)) {
  // handler uses it — provided by the inlined validate module. OK.
}

const bundled = `/* GENERATED FILE — do not edit. Run: node scripts/deploy-worker.mjs */
${pages}
${validate}
${handler}
`;

const outDir = resolve(root, 'worker/.build');
mkdirSync(outDir, { recursive: true });
const bundledPath = resolve(outDir, 'bundled.js');
writeFileSync(bundledPath, bundled);
console.log(`assembled worker: ${bundled.length} bytes (${SCRIPT_NAME})`);

const CF_API = 'https://api.cloudflare.com/client/v4';

async function cf(path, init = {}) {
  const res = await fetch(CF_API + path, {
    ...init,
    headers: {
      Authorization: `Bearer ${CF_API_TOKEN}`,
      ...(init.headers || {}),
    },
  });
  const data = await res.json().catch(() => null);
  if (!res.ok || (data && data.success === false)) {
    throw new Error(`CF API ${path} failed: ${res.status} ${JSON.stringify(data?.errors ?? data)}`);
  }
  return data;
}

const secrets = {
  BOT_TOKEN: requiredEnv('BOT_TOKEN'),
  SESSION_SECRET: requiredEnv('SESSION_SECRET'),
  ADMIN_LOGINS: requiredEnv('ADMIN_LOGINS'),
  PUBLIC_ORIGIN: process.env.PUBLIC_ORIGIN || 'https://apps.endril.com',
  SUBMISSIONS_REPO: process.env.SUBMISSIONS_REPO || 'geograhic/anki-browser-submissions',
  MAIN_REPO: process.env.MAIN_REPO || 'geograhic/anki-browser',
};
// OAuth is optional: without client_id/secret the Worker's /oauth/login
// degrades to `not_configured` (handleOauthLogin checks for a falsy value).
// This lets us deploy everything else first and just re-run this script with
// the two OAuth vars once the GitHub OAuth App exists.
if (process.env.GITHUB_CLIENT_ID) secrets.GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
if (process.env.GITHUB_CLIENT_SECRET) secrets.GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;

// Classic Service Worker → upload as the raw script body (NOT multipart,
// which the API parses as ES-module and rejects with error 10021).
console.log('uploading worker (classic, raw body)…');
await cf(`/accounts/${CF_ACCOUNT_ID}/workers/scripts/${SCRIPT_NAME}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/javascript' },
  body: bundled,
});
console.log('worker uploaded.');

console.log('setting secrets…');
for (const [name, text] of Object.entries(secrets)) {
  await cf(`/accounts/${CF_ACCOUNT_ID}/workers/scripts/${SCRIPT_NAME}/secrets`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, text, type: 'secret_text' }),
  });
}
console.log('secrets set:', Object.keys(secrets).join(', '));

console.log('ensuring route…');
// Idempotent: delete any existing route for this pattern, then create it.
const routes = await cf(`/zones/${CF_ZONE_ID}/workers/routes`);
const existing = (routes.result || []).find((r) => r.pattern === ROUTE_PATTERN);
if (existing) {
  await cf(`/zones/${CF_ZONE_ID}/workers/routes/${existing.id}`, { method: 'DELETE' });
}
await cf(`/zones/${CF_ZONE_ID}/workers/routes`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ pattern: ROUTE_PATTERN, script: SCRIPT_NAME }),
});
console.log('route ready:', ROUTE_PATTERN, '->', SCRIPT_NAME);

console.log('deploy-worker complete.');
