/**
 * Deploy the prebuilt `dist/` folder to Vercel via the REST Deployments API.
 * No Vercel CLI, no GitHub integration. Token comes from VERCEL_TOKEN (env).
 *
 * Steps:
 *   1. Create the project (idempotent) and ensure ssoProtection is OFF
 *      (otherwise *.vercel.app is gated with "Hello, are you okay?" / 403).
 *   2. Walk dist/, base64 each file, POST to /v13/deployments (target production).
 *   3. Poll until READY and print the production alias (project.vercel.app).
 */
import { readdir, readFile, stat as fsStat } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(import.meta.url), '..', '..');
const dist = resolve(root, 'dist');
const TOKEN = process.env.VERCEL_TOKEN;
const NAME = 'anki-browser';

if (!TOKEN) {
  console.error('VERCEL_TOKEN not set');
  process.exit(1);
}

const api = async (method, path, body) => {
  const res = await fetch('https://api.vercel.com' + path, {
    method,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  if (!res.ok) {
    throw new Error(`${method} ${path} -> ${res.status} ${text}`);
  }
  return json;
};

// 1. Project (create if missing, then disable SSO)
let projectId;
try {
  const created = await api('POST', '/v9/projects', { name: NAME });
  projectId = created.id;
  console.log('created project', NAME, projectId);
} catch (e) {
  if (String(e.message).includes('already exists') || String(e.message).includes('409')) {
    const existing = await api('GET', `/v9/projects/${NAME}`);
    projectId = existing.id;
    console.log('project already exists', NAME, projectId);
  } else {
    throw e;
  }
}
await api('PATCH', `/v9/projects/${projectId}`, { ssoProtection: null });
console.log('ssoProtection disabled');

// 2. Collect files
const files = [];
async function collect(dir) {
  for (const name of await readdir(dir)) {
    const p = join(dir, name);
    const s = await fsStat(p);
    if (s.isDirectory()) {
      await collect(p);
    } else {
      const rel = relative(dist, p).replace(/\\/g, '/');
      const data = await readFile(p);
      files.push({ file: rel, data: data.toString('base64'), encoding: 'base64' });
    }
  }
}
await collect(dist);
console.log(`prepared ${files.length} files`);

// 3. Deploy
const dep = await api('POST', '/v13/deployments', {
  name: NAME,
  target: 'production',
  files,
});
console.log('deployment created:', dep.id, 'state:', dep.readyState);

// 4. Poll
let state = dep.readyState;
let deployment = dep;
for (let i = 0; i < 30 && state !== 'READY' && state !== 'ERROR'; i++) {
  await new Promise((r) => setTimeout(r, 2000));
  deployment = await api('GET', `/v13/deployments/${dep.id}`);
  state = deployment.readyState;
  console.log(`  state: ${state}`);
}
if (state !== 'READY') {
  console.error('deployment not ready:', state);
  process.exit(1);
}

const alias = deployment.alias && deployment.alias[0];
console.log('DEPLOYED ->', alias);
console.log('INSPECT ->', `https://${NAME}.vercel.app`);
