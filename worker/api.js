/**
 * Anki Browser moderation API — Cloudflare Worker (classic format).
 *
 * IMPORTANT: this file is NOT uploaded as-is. `scripts/deploy-worker.mjs`
 * concatenates it with the shared validation modules so that the submission
 * rules exist in exactly one place:
 *
 *     src/content/pages.mjs     (licence list)
 *   + src/content/validate.mjs  (sanitizeSubmission / slugify / submissionToDeck)
 *   + worker/api.js             (this file: routing, OAuth, GitHub, sessions)
 *
 * Security model:
 *   - Visitors sign in with GitHub via OAuth, scope `read:user` ONLY. The app
 *     never receives a token; the Worker keeps a signed HttpOnly cookie.
 *   - Issues in the submissions repo are created by a bot token, not with the
 *     visitor's authority — nobody is ever asked for write access to their
 *     repositories.
 *   - Moderator actions require the session's GitHub login to be in the
 *     ADMIN_LOGINS allowlist (a Worker secret). The browser is never trusted.
 */

/* -------------------------------------------------------------------------- */
/* Configuration                                                              */
/* -------------------------------------------------------------------------- */

const ORIGIN = (typeof PUBLIC_ORIGIN !== 'undefined' && PUBLIC_ORIGIN) || 'https://apps.endril.com';
const APP_BASE = '/anki-browser';
const API_PREFIX = APP_BASE + '/api';
const SUBMISSIONS_REPO_NAME = (typeof SUBMISSIONS_REPO !== 'undefined' && SUBMISSIONS_REPO) || 'geograhic/anki-browser-submissions';
const MAIN_REPO_NAME = (typeof MAIN_REPO !== 'undefined' && MAIN_REPO) || 'geograhic/anki-browser';
const INDEX_PATH = 'public/decks/index.json';
const SESSION_COOKIE = 'ab_session';
const SESSION_TTL = 60 * 60 * 24 * 30; // 30 days

const LABEL_SUBMISSION = 'deck-submission';
const LABEL_PENDING = 'status/pending';
const LABEL_APPROVED = 'status/approved';
const LABEL_REJECTED = 'status/rejected';

const GITHUB_AUTHORIZE = 'https://github.com/login/oauth/authorize';
const GITHUB_TOKEN = 'https://github.com/login/oauth/access_token';
const GITHUB_API = 'https://api.github.com';

/* -------------------------------------------------------------------------- */
/* Small helpers                                                              */
/* -------------------------------------------------------------------------- */

const enc = new TextEncoder();

function b64urlFromBytes(bytes) {
  let s = btoa(String.fromCharCode(...new Uint8Array(bytes)));
  return s.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlFromString(str) {
  return b64urlFromBytes(enc.encode(str));
}

function bytesFromB64url(str) {
  const pad = str.length % 4 ? '='.repeat(4 - (str.length % 4)) : '';
  const bin = atob(str.replace(/-/g, '+').replace(/_/g, '/') + pad);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

async function hmac(secret, message) {
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  return crypto.subtle.sign('HMAC', key, enc.encode(message));
}

function json(body, init = {}) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...(init.headers || {}),
    },
  });
}

function corsHeaders(request) {
  const origin = request.headers.get('Origin') || '';
  const allowed = [ORIGIN, 'http://localhost:5273', 'http://127.0.0.1:5273'];
  const headers = {
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
  if (allowed.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Credentials'] = 'true';
  }
  return headers;
}

/** Same-origin check for mutating requests (CSRF). */
function sameOrigin(request) {
  const origin = request.headers.get('Origin');
  if (!origin) return true; // same-site form posts may omit it
  return origin === ORIGIN || origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:');
}

function getCookie(request, name) {
  const header = request.headers.get('Cookie') || '';
  for (const part of header.split(';')) {
    const [k, ...rest] = part.trim().split('=');
    if (k === name) return rest.join('=');
  }
  return null;
}

/* -------------------------------------------------------------------------- */
/* Sessions                                                                   */
/* -------------------------------------------------------------------------- */

async function signSession(user, secret) {
  const payload = b64urlFromString(JSON.stringify({ u: user, iat: Date.now() }));
  const sig = b64urlFromBytes(await hmac(secret, payload));
  return `${payload}.${sig}`;
}

async function readSession(request, env) {
  const raw = getCookie(request, SESSION_COOKIE);
  if (!raw || !env.SESSION_SECRET) return null;
  const [payload, sig] = raw.split('.');
  if (!payload || !sig) return null;
  const expected = b64urlFromBytes(await hmac(env.SESSION_SECRET, payload));
  if (sig !== expected) return null;
  try {
    const data = JSON.parse(new TextDecoder().decode(bytesFromB64url(payload)));
    if (!data.u || Date.now() - data.iat > SESSION_TTL * 1000) return null;
    return data.u;
  } catch {
    return null;
  }
}

function sessionCookie(value) {
  return `${SESSION_COOKIE}=${value}; Path=${APP_BASE}; Max-Age=${SESSION_TTL}; HttpOnly; Secure; SameSite=Lax`;
}

const CLEAR_COOKIE = `${SESSION_COOKIE}=; Path=${APP_BASE}; Max-Age=0; HttpOnly; Secure; SameSite=Lax`;

function isAdmin(user, env) {
  if (!user) return false;
  const list = (env.ADMIN_LOGINS || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
  return list.includes(user.login.toLowerCase());
}

/* -------------------------------------------------------------------------- */
/* GitHub API                                                                 */
/* -------------------------------------------------------------------------- */

async function gh(path, { method = 'GET', token, body } = {}) {
  const res = await fetch(GITHUB_API + path, {
    method,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'User-Agent': 'anki-browser-api',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  return { ok: res.ok, status: res.status, data, headers: res.headers };
}

async function ensureLabels(token) {
  // Idempotent per isolate; GitHub answers 422 when a label already exists.
  const wanted = [
    [LABEL_SUBMISSION, 'Community deck submission', '0e8a16'],
    [LABEL_PENDING, 'Waiting for review', 'fbca04'],
    [LABEL_APPROVED, 'Published on Anki Browser', '0e8a16'],
    [LABEL_REJECTED, 'Not accepted', 'e0564b'],
  ];
  for (const [name, description, color] of wanted) {
    await gh(`/repos/${SUBMISSIONS_REPO_NAME}/labels`, {
      method: 'POST',
      token,
      body: { name, description, color },
    });
  }
}

/* -------------------------------------------------------------------------- */
/* Submission payload <-> issue body                                          */
/* -------------------------------------------------------------------------- */

const PAYLOAD_BEGIN = '<!-- deck-submission:json';
const PAYLOAD_END = '-->';
const APPROVED_MARK = (slug) => `<!-- approved-slug: ${slug} -->`;

function payloadToBody(payload, user) {
  const download = payload.downloadUrl || '';
  const pretty = [
    `## Deck submission`,
    '',
    `Submitted by **@${user.login}** via [Anki Browser](${ORIGIN}${APP_BASE}/submit/).`,
    '',
    '| Field | Value |',
    '| --- | --- |',
    `| Title | ${payload.title} |`,
    `| Summary | ${payload.subtitle} |`,
    `| Download | ${download} |`,
    payload.coverUrl ? `| Cover | ${payload.coverUrl} |` : '',
    payload.previewUrl ? `| Instant preview | ${payload.previewUrl} |` : '',
    payload.authorName
      ? `| Author | ${payload.authorName}${payload.authorUrl ? ' — ' + payload.authorUrl : ''} |`
      : '',
    payload.tags ? `| Tags | ${payload.tags} |` : '',
    `| Language | ${payload.language || 'en'} |`,
    `| License | ${payload.license} |`,
    payload.note ? `| Note | ${payload.note} |` : '',
    '',
    '<!-- Dear moderator: review this deck in the admin console at ' + ORIGIN + APP_BASE + '/#/admin -->',
  ]
    .filter(Boolean)
    .join('\n');
  // Machine-readable copy first so it survives any markdown editing below it.
  return `${PAYLOAD_BEGIN}\n${JSON.stringify(payload)}\n${PAYLOAD_END}\n\n${pretty}`;
}

function bodyToPayload(bodyText) {
  const start = bodyText.indexOf(PAYLOAD_BEGIN);
  if (start < 0) return null;
  const from = bodyText.indexOf('\n', start) + 1;
  const to = bodyText.indexOf(PAYLOAD_END, from);
  if (to < 0) return null;
  try {
    return JSON.parse(bodyText.slice(from, to).trim());
  } catch {
    return null;
  }
}

/* -------------------------------------------------------------------------- */
/* Submissions listing                                                        */
/* -------------------------------------------------------------------------- */

function statusOf(issue) {
  const labels = (issue.labels ?? []).map((l) => l.name);
  if (labels.includes(LABEL_APPROVED)) return 'approved';
  if (labels.includes(LABEL_REJECTED)) return 'rejected';
  if (labels.includes(LABEL_PENDING)) return 'pending';
  return 'other';
}

async function listSubmissionIssues(token) {
  const res = await gh(
    `/repos/${SUBMISSIONS_REPO_NAME}/issues?labels=${encodeURIComponent(LABEL_SUBMISSION)}&state=all&per_page=100&sort=created&direction=desc`,
    { token },
  );
  if (!res.ok) return [];
  // Issues API also returns PRs; a submissions repo has none, but filter anyway.
  return (res.data || []).filter((i) => !i.pull_request);
}

function issueToSubmission(issue) {
  const payload = bodyToPayload(issue.body || '') || {};
  const commentsUrl = issue.comments_url;
  return {
    number: issue.number,
    title: issue.title,
    htmlUrl: issue.html_url,
    state: issue.state,
    status: statusOf(issue),
    createdAt: issue.created_at,
    updatedAt: issue.updated_at,
    submittedBy: payload.submittedBy || (issue.title.match(/@([\w-]+)/) || [])[1] || 'unknown',
    deckSlug: (issue.body || '').match(/<!-- approved-slug: ([\w-]+) -->/)?.[1],
    payload,
    _commentsUrl: commentsUrl,
  };
}

async function lastModeratorComment(issue, token, submitter) {
  if (!issue.comments && !issue._commentsUrl) return undefined;
  const res = await gh(`${issue._commentsUrl || issue.comments_url}?per_page=100`, { token });
  if (!res.ok) return undefined;
  const comments = res.data || [];
  for (let i = comments.length - 1; i >= 0; i--) {
    const c = comments[i];
    if (c.user?.login?.toLowerCase() !== String(submitter).toLowerCase()) {
      return {
        author: c.user?.login ?? '',
        body: c.body ?? '',
        htmlUrl: c.html_url ?? '',
        createdAt: c.created_at ?? '',
      };
    }
  }
  return undefined;
}

/* -------------------------------------------------------------------------- */
/* Route handlers                                                             */
/* -------------------------------------------------------------------------- */

async function handleSession(request, env) {
  const user = await readSession(request, env);
  if (!user) return json({ user: null });
  return json({
    user: {
      login: user.login,
      avatarUrl: user.avatarUrl,
      htmlUrl: user.htmlUrl,
      isAdmin: isAdmin(user, env),
    },
  });
}

async function handleOauthLogin(request, env, url) {
  const next = url.searchParams.get('next') || APP_BASE + '/';
  // Open-redirect guard: only paths inside the app are remembered.
  const safeNext = next.startsWith(APP_BASE + '/') || next === APP_BASE ? next : APP_BASE + '/';
  if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) {
    return json({ error: 'not_configured' }, { status: 500 });
  }
  const statePayload = b64urlFromString(JSON.stringify({ next: safeNext, iat: Date.now() }));
  const sig = b64urlFromBytes(await hmac(env.SESSION_SECRET, statePayload));
  const state = `${statePayload}.${sig}`;
  const redirect = new URL(GITHUB_AUTHORIZE);
  redirect.searchParams.set('client_id', env.GITHUB_CLIENT_ID);
  redirect.searchParams.set('scope', 'read:user');
  redirect.searchParams.set('state', state);
  redirect.searchParams.set('allow_signup', 'true');
  return Response.redirect(redirect.toString(), 302);
}

async function handleOauthCallback(request, env, url) {
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state') || '';
  const [statePayload, stateSig] = state.split('.');
  let next = APP_BASE + '/submit/';
  try {
    const expected = b64urlFromBytes(await hmac(env.SESSION_SECRET, statePayload));
    if (stateSig === expected) {
      const data = JSON.parse(new TextDecoder().decode(bytesFromB64url(statePayload)));
      if (Date.now() - data.iat < 10 * 60 * 1000 && data.next) next = data.next;
    }
  } catch {
    /* fall through with the default next */
  }

  if (!code) {
    return Response.redirect(`${ORIGIN}${next}#submission-error`, 302);
  }

  const tokenRes = await fetch(GITHUB_TOKEN, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code,
    }),
  });
  const tokenData = await tokenRes.json().catch(() => ({}));
  const accessToken = tokenData.access_token;
  if (!accessToken) {
    return Response.redirect(`${ORIGIN}${next}#submission-error`, 302);
  }

  const me = await gh('/user', { token: accessToken });
  if (!me.ok) {
    return Response.redirect(`${ORIGIN}${next}#submission-error`, 302);
  }

  const user = {
    login: me.data.login,
    avatarUrl: me.data.avatar_url,
    htmlUrl: me.data.html_url,
  };
  const cookie = await signSession(user, env.SESSION_SECRET);
  return new Response(null, {
    status: 302,
    headers: {
      Location: `${ORIGIN}${next}`,
      'Set-Cookie': sessionCookie(cookie),
      'Cache-Control': 'no-store',
    },
  });
}

function handleLogout() {
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', 'Set-Cookie': CLEAR_COOKIE, 'Cache-Control': 'no-store' },
  });
}

async function handleCreateSubmission(request, env) {
  const user = await readSession(request, env);
  if (!user) return json({ error: 'unauthorized' }, { status: 401 });
  if (!env.BOT_TOKEN) return json({ error: 'not_configured' }, { status: 500 });

  const body = await request.json().catch(() => null);
  if (!body) return json({ error: 'validation', fields: {} }, { status: 400 });

  // The exact same validation the browser runs — shared source of truth.
  const raw = {
    title: body.title ?? '',
    downloadUrl: body.downloadUrl ?? '',
    downloadLabel: body.downloadLabel ?? '',
    downloadNote: body.downloadNote ?? '',
    subtitle: body.subtitle ?? '',
    coverUrl: body.coverUrl ?? '',
    previewUrl: body.previewUrl ?? '',
    authorName: body.authorName ?? '',
    authorUrl: body.authorUrl ?? '',
    extraDownloadUrl: body.extraDownloadUrl ?? '',
    extraDownloadLabel: body.extraDownloadLabel ?? '',
    content: body.content ?? '',
    language: body.language ?? 'en',
    license: body.license ?? '',
    tags: body.tags ?? '',
    note: body.note ?? '',
  };
  const check = sanitizeSubmission(raw);
  if (!check.ok) {
    return json({ error: 'validation', fields: check.errors }, { status: 400 });
  }

  // Simple per-user rate limit: at most 3 open submissions in 24h.
  const issues = await listSubmissionIssues(env.BOT_TOKEN);
  const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
  const mine = issues.filter(
    (i) =>
      i.title.includes(`@${user.login})`) &&
      new Date(i.created_at).getTime() > dayAgo &&
      statusOf(i) !== 'approved',
  );
  if (mine.length >= 3) return json({ error: 'rate_limited' }, { status: 429 });

  await ensureLabels(env.BOT_TOKEN);

  // The flat form value is what gets stored; the deck object (with its unique
  // slug) is built only at approval time, against the live index.
  const stored = {
    ...check.value,
    submittedBy: user.login,
    submittedAt: new Date().toISOString(),
  };
  const issue = await gh(`/repos/${SUBMISSIONS_REPO_NAME}/issues`, {
    method: 'POST',
    token: env.BOT_TOKEN,
    body: {
      title: `Deck submission: ${check.value.title} (@${user.login})`,
      body: payloadToBody(stored, user),
      labels: [LABEL_SUBMISSION, LABEL_PENDING],
    },
  });
  if (!issue.ok) {
    return json({ error: 'error' }, { status: 502 });
  }
  return json({ number: issue.data.number, htmlUrl: issue.data.html_url });
}

async function handleMySubmissions(request, env) {
  const user = await readSession(request, env);
  if (!user) return json({ error: 'unauthorized' }, { status: 401 });
  if (!env.BOT_TOKEN) return json({ error: 'not_configured' }, { status: 500 });

  const issues = await listSubmissionIssues(env.BOT_TOKEN);
  const mine = issues.filter((i) => i.title.endsWith(`(@${user.login})`));
  const out = [];
  for (const issue of mine) {
    const s = issueToSubmission(issue);
    const comment = await lastModeratorComment(issue, env.BOT_TOKEN, user.login);
    if (comment) s.lastComment = comment;
    delete s._commentsUrl;
    out.push(s);
  }
  return json({ submissions: out });
}

async function handleAdminOverview(request, env) {
  const user = await readSession(request, env);
  if (!user || !isAdmin(user, env)) return json({ error: 'forbidden' }, { status: 403 });
  if (!env.BOT_TOKEN) return json({ error: 'not_configured' }, { status: 500 });

  const issues = await listSubmissionIssues(env.BOT_TOKEN);
  const submissions = [];
  for (const issue of issues) {
    const s = issueToSubmission(issue);
    const comment = await lastModeratorComment(issue, env.BOT_TOKEN, s.submittedBy);
    if (comment) s.lastComment = comment;
    delete s._commentsUrl;
    submissions.push(s);
  }

  const index = await gh(`/repos/${MAIN_REPO_NAME}/contents/${INDEX_PATH}`, { token: env.BOT_TOKEN });
  let decks = [];
  if (index.ok) {
    try {
      decks = JSON.parse(decodeBase64(index.data.content));
    } catch {
      decks = [];
    }
  }
  return json({ submissions, decks, moderator: user.login });
}

function decodeBase64(content) {
  // GitHub Contents API returns base64 with newlines.
  const bin = atob(content.replace(/\n/g, ''));
  return decodeURIComponent(
    Array.from(bin)
      .map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
      .join(''),
  );
}

function encodeBase64(str) {
  const bytes = enc.encode(str);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

async function commitIndex(env, decks, message) {
  const current = await gh(`/repos/${MAIN_REPO_NAME}/contents/${INDEX_PATH}`, { token: env.BOT_TOKEN });
  if (!current.ok) return { ok: false, status: current.status };
  const put = await gh(`/repos/${MAIN_REPO_NAME}/contents/${INDEX_PATH}`, {
    method: 'PUT',
    token: env.BOT_TOKEN,
    body: {
      message,
      content: encodeBase64(JSON.stringify(decks, null, 2) + '\n'),
      sha: current.data.sha,
    },
  });
  return { ok: put.ok, status: put.status, commit: put.data?.commit?.sha, content: put.data?.content };
}

async function handleModerate(request, env) {
  const user = await readSession(request, env);
  if (!user || !isAdmin(user, env)) return json({ error: 'forbidden' }, { status: 403 });
  if (!env.BOT_TOKEN) return json({ error: 'not_configured' }, { status: 500 });

  const body = await request.json().catch(() => null);
  const action = body?.action;
  const reason = String(body?.reason ?? '').slice(0, 500);

  const indexRes = await gh(`/repos/${MAIN_REPO_NAME}/contents/${INDEX_PATH}`, { token: env.BOT_TOKEN });
  if (!indexRes.ok) return json({ error: 'error' }, { status: 502 });
  /** @type {any[]} */
  let decks;
  try {
    decks = JSON.parse(decodeBase64(indexRes.data.content));
  } catch {
    return json({ error: 'error' }, { status: 502 });
  }

  if (action === 'approve') {
    const number = Number(body?.number);
    const issues = await listSubmissionIssues(env.BOT_TOKEN);
    const issue = issues.find((i) => i.number === number);
    if (!issue) return json({ error: 'not_found' }, { status: 404 });
    const payload = bodyToPayload(issue.body || '');
    if (!payload) return json({ error: 'bad_payload' }, { status: 422 });

    const deck = submissionToDeck(payload, decks, {
      submittedBy: payload.submittedBy,
      issue: number,
    });
    decks.push(deck);
    const commit = await commitIndex(
      env,
      decks,
      `deck(submission): publish "${deck.title}" by @${payload.submittedBy} (#${number})`,
    );
    if (!commit.ok) return json({ error: 'commit_failed' }, { status: 502 });

    const deckUrl = `${ORIGIN}${APP_BASE}/deck/${deck.slug}/`;
    await gh(`/repos/${SUBMISSIONS_REPO_NAME}/issues/${number}/labels`, {
      method: 'POST',
      token: env.BOT_TOKEN,
      body: { labels: [LABEL_APPROVED] },
    });
    await gh(`/repos/${SUBMISSIONS_REPO_NAME}/issues/${number}/labels/${encodeURIComponent(LABEL_PENDING)}`, {
      method: 'DELETE',
      token: env.BOT_TOKEN,
    });
    await gh(`/repos/${SUBMISSIONS_REPO_NAME}/issues/${number}/comments`, {
      method: 'POST',
      token: env.BOT_TOKEN,
      body: {
        body: `✅ Approved and published: **${deck.title}** → ${deckUrl}\n\nIt goes live automatically within 2–3 minutes. Thank you, @${payload.submittedBy}!`,
      },
    });
    await gh(`/repos/${SUBMISSIONS_REPO_NAME}/issues/${number}`, {
      method: 'PATCH',
      token: env.BOT_TOKEN,
      body: { state: 'closed', body: (issue.body || '') + `\n${APPROVED_MARK(deck.slug)}` },
    });
    return json({ ok: true, deckUrl, commit: commit.commit });
  }

  if (action === 'reject') {
    const number = Number(body?.number);
    if (!reason) return json({ error: 'reason_required' }, { status: 400 });
    await gh(`/repos/${SUBMISSIONS_REPO_NAME}/issues/${number}/labels`, {
      method: 'POST',
      token: env.BOT_TOKEN,
      body: { labels: [LABEL_REJECTED] },
    });
    await gh(`/repos/${SUBMISSIONS_REPO_NAME}/issues/${number}/labels/${encodeURIComponent(LABEL_PENDING)}`, {
      method: 'DELETE',
      token: env.BOT_TOKEN,
    });
    await gh(`/repos/${SUBMISSIONS_REPO_NAME}/issues/${number}/comments`, {
      method: 'POST',
      token: env.BOT_TOKEN,
      body: { body: `❌ This submission was not accepted.\n\nReason: ${reason}` },
    });
    await gh(`/repos/${SUBMISSIONS_REPO_NAME}/issues/${number}`, {
      method: 'PATCH',
      token: env.BOT_TOKEN,
      body: { state: 'closed' },
    });
    return json({ ok: true });
  }

  if (action === 'unpublish') {
    const slug = String(body?.slug ?? '');
    const deck = decks.find((d) => d.slug === slug);
    if (!deck) return json({ error: 'not_found' }, { status: 404 });
    const next = decks.filter((d) => d.slug !== slug);
    const commit = await commitIndex(env, next, `deck: unpublish "${deck.title}" (${slug}) after review`);
    if (!commit.ok) return json({ error: 'commit_failed' }, { status: 502 });

    // Close the loop on the original submission ticket, if there is one.
    const issues = await listSubmissionIssues(env.BOT_TOKEN);
    const origin = issues.find((i) => (i.body || '').includes(APPROVED_MARK(slug)));
    if (origin) {
      await gh(`/repos/${SUBMISSIONS_REPO_NAME}/issues/${origin.number}/comments`, {
        method: 'POST',
        token: env.BOT_TOKEN,
        body: { body: `⚠️ This deck has been unpublished from the gallery by the moderator.` },
      });
      await gh(`/repos/${SUBMISSIONS_REPO_NAME}/issues/${origin.number}/labels`, {
        method: 'POST',
        token: env.BOT_TOKEN,
        body: { labels: [LABEL_REJECTED] },
      });
    }
    return json({ ok: true });
  }

  return json({ error: 'unknown_action' }, { status: 400 });
}

/* -------------------------------------------------------------------------- */
/* Router                                                                     */
/* -------------------------------------------------------------------------- */

async function handle(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;
  if (!path.startsWith(API_PREFIX)) {
    return json({ error: 'not_found' }, { status: 404 });
  }
  const route = path.slice(API_PREFIX.length).replace(/\/+$/, '') || '/';

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(request) });
  }

  let response;
  try {
    if (request.method === 'GET' && route === '/session') {
      response = await handleSession(request, env);
    } else if (request.method === 'GET' && route === '/oauth/login') {
      response = await handleOauthLogin(request, env, url);
    } else if (request.method === 'GET' && route === '/oauth/callback') {
      response = await handleOauthCallback(request, env, url);
    } else if (request.method === 'POST' && route === '/logout') {
      response = handleLogout();
    } else if (request.method === 'POST' && route === '/submissions') {
      if (!sameOrigin(request)) response = json({ error: 'csrf' }, { status: 403 });
      else response = await handleCreateSubmission(request, env);
    } else if (request.method === 'GET' && route === '/submissions/mine') {
      response = await handleMySubmissions(request, env);
    } else if (request.method === 'GET' && route === '/admin/overview') {
      response = await handleAdminOverview(request, env);
    } else if (request.method === 'POST' && route === '/admin/moderate') {
      if (!sameOrigin(request)) response = json({ error: 'csrf' }, { status: 403 });
      else response = await handleModerate(request, env);
    } else {
      response = json({ error: 'not_found' }, { status: 404 });
    }
  } catch (e) {
    response = json({ error: 'internal', message: String((e && e.message) || e) }, { status: 500 });
  }

  const headers = new Headers(response.headers);
  for (const [k, v] of Object.entries(corsHeaders(request))) headers.set(k, v);
  return new Response(response.body, { status: response.status, headers });
}

addEventListener('fetch', (event) => {
  event.respondWith(handle(event.request, {
    GITHUB_CLIENT_ID: typeof GITHUB_CLIENT_ID !== 'undefined' ? GITHUB_CLIENT_ID : undefined,
    GITHUB_CLIENT_SECRET: typeof GITHUB_CLIENT_SECRET !== 'undefined' ? GITHUB_CLIENT_SECRET : undefined,
    BOT_TOKEN: typeof BOT_TOKEN !== 'undefined' ? BOT_TOKEN : undefined,
    SESSION_SECRET: typeof SESSION_SECRET !== 'undefined' ? SESSION_SECRET : undefined,
    ADMIN_LOGINS: typeof ADMIN_LOGINS !== 'undefined' ? ADMIN_LOGINS : undefined,
  }));
});
