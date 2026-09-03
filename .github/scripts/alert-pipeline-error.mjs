/**
 * Open (or update) a `pipeline-error` issue in this repository when the
 * anki-browser-api Worker reports a failure.
 *
 * The Worker fires this on best effort: if the GitHub PAT it uses to call
 * repository_dispatch is itself broken, no alert can land. The owner then
 * has to rely on user-facing failure reports to find out.
 */
const owner = 'geograhic';
const repo = 'anki-browser';
const label = 'pipeline-error';
const token = process.env.GH_TOKEN;
const reason = (process.env.REASON || '(no reason provided)').slice(0, 500);
const ts = process.env.TS || new Date().toISOString();
const endpoint = process.env.ENDPOINT || '(unknown endpoint)';

if (!token) {
  console.error('GH_TOKEN is required.');
  process.exit(1);
}

const api = 'https://api.github.com';
const headers = {
  Authorization: `Bearer ${token}`,
  'User-Agent': 'anki-browser-pipeline-alert',
  Accept: 'application/vnd.github+json',
  'Content-Type': 'application/json',
};

async function gh(method, path, body) {
  const res = await fetch(api + path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  if (!res.ok) {
    console.error(`GH ${method} ${path} -> ${res.status}: ${text.slice(0, 300)}`);
    process.exit(1);
  }
  return data;
}

const title = `🚨 Submission pipeline error — ${reason.replace(/\s+/g, ' ').slice(0, 80)}`;
const body = [
  '## 🚨 The submission / moderation pipeline is failing',
  '',
  `Endpoint: \`${endpoint}\``,
  `Reason: ${reason}`,
  `First seen: \`${ts}\``,
  `Last update: \`${new Date().toISOString()}\``,
  '',
  '### What this breaks',
  '- **Visitor deck submissions** — the Worker cannot open the issue in `geograhic/anki-browser-submissions`.',
  '- **Moderation**: approve / reject / unpublish all fail because the Worker cannot commit to `public/decks/index.json` or post comments on the submission issue.',
  '- Anything that requires the `BOT_TOKEN` GitHub PAT or the `GITHUB_CLIENT_SECRET` OAuth secret to be valid.',
  '',
  '### How to fix',
  '1. **Identify which secret is wrong.** The reason text usually names the operation (e.g. `issues.create` → `BOT_TOKEN` is bad; `OAuth callback` → `GITHUB_CLIENT_SECRET` is bad).',
  '2. **Rotate the secret** at the source:',
  '   - `BOT_TOKEN`: generate a new classic (or fine-grained) PAT at https://github.com/settings/tokens, then update the `GitHub PAT 20260714` entry in `AI-dev-key-v20260714.kdbx`.',
  '   - `GITHUB_CLIENT_SECRET`: roll the secret at https://github.com/settings/developers, then update the `GitHub OAuth anki-browser 20260903` entry in the same KeePass vault.',
  '3. **Redeploy the Worker** so it picks up the new value:',
  '   ```bash',
  '   npm run deploy:api',
  '   ```',
  '4. **Close this issue** once submissions work again — the next pipeline error will open a fresh one.',
  '',
  '_This issue is created and maintained by `alert-pipeline-error.yml` on repository_dispatch from the anki-browser-api Worker. Do not close it manually unless the pipeline is healthy again._',
].join('\n');

// Find an existing open alert so we update instead of duplicating.
const openIssues = await gh(`/repos/${owner}/${repo}/issues?state=open&labels=${encodeURIComponent(label)}&per_page=10`);
const mine = (openIssues || []).find((i) => !i.pull_request);
if (mine) {
  await gh('PATCH', `/repos/${owner}/${repo}/issues/${mine.number}`, { title, body });
  console.log(`Updated pipeline-error issue #${mine.number}.`);
} else {
  const created = await gh('POST', `/repos/${owner}/${repo}/issues`, {
    title,
    body,
    labels: [label],
  });
  console.log(`Created pipeline-error issue #${created.number}.`);
}
