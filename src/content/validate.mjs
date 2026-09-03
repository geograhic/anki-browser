/**
 * Submission validation and normalisation — DOM-free, shared by BOTH the
 * browser form and the Cloudflare Worker.
 *
 * Keeping the rules in one place means the client can never accept something
 * the server rejects (or vice versa). Field error values are **i18n keys**
 * relative to `submit.*`, so the browser shows them translated while the
 * Worker can log or return them verbatim.
 */

import { SUPPORTED_LICENSES } from './pages.mjs';

export const DEFAULT_LICENSE = 'CC BY-NC 4.0';
export const MAX_TAGS = 4;
export const MAX_CONTENT = 4000;
export const MAX_NOTE = 500;

const HTTP_RE = /^https?:\/\/\S+$/i;

function clean(v) {
  return typeof v === 'string' ? v.trim() : '';
}

function isUrl(v) {
  return HTTP_RE.test(v);
}

/**
 * Turn a raw form object into a validated submission payload.
 *
 * @param {Record<string, unknown>} raw
 * @returns {{ok: boolean, errors: Record<string,string>, value: Record<string, unknown>}}
 */
export function sanitizeSubmission(raw) {
  const errors = {};
  const value = {};

  const title = clean(raw.title);
  if (!title) errors.title = 'validation.title';
  else if (title.length > 80) errors.title = 'validation.title';
  value.title = title.slice(0, 80);

  const downloadUrl = clean(raw.downloadUrl);
  if (!downloadUrl) errors.downloadUrl = 'validation.downloadUrl';
  else if (!isUrl(downloadUrl)) errors.downloadUrl = 'validation.downloadUrl';
  value.downloadUrl = downloadUrl;

  const subtitle = clean(raw.subtitle);
  if (!subtitle) errors.subtitle = 'validation.subtitle';
  else if (subtitle.length > 120) errors.subtitle = 'validation.subtitle';
  value.subtitle = subtitle.slice(0, 120);

  // ---- optional fields (validated only when present) ----
  const coverUrl = clean(raw.coverUrl);
  if (coverUrl && !isUrl(coverUrl)) errors.coverUrl = 'validation.coverUrl';
  value.coverUrl = coverUrl;

  const previewUrl = clean(raw.previewUrl);
  if (previewUrl && !isUrl(previewUrl)) errors.previewUrl = 'validation.previewUrl';
  value.previewUrl = previewUrl;

  const authorUrl = clean(raw.authorUrl);
  if (authorUrl && !isUrl(authorUrl)) errors.authorUrl = 'validation.authorUrl';
  value.authorUrl = authorUrl;

  const extraDownloadUrl = clean(raw.extraDownloadUrl);
  if (extraDownloadUrl && !isUrl(extraDownloadUrl)) errors.extraDownloadUrl = 'validation.downloadUrl';
  value.extraDownloadUrl = extraDownloadUrl;

  value.downloadLabel = clean(raw.downloadLabel).slice(0, 40);
  value.downloadNote = clean(raw.downloadNote).slice(0, 80);
  value.extraDownloadLabel = clean(raw.extraDownloadLabel).slice(0, 40);

  value.authorName = clean(raw.authorName).slice(0, 60);
  value.content = clean(raw.content).slice(0, MAX_CONTENT);

  const language = clean(raw.language);
  value.language = language ? language.slice(0, 20) : 'en';

  const license = clean(raw.license);
  value.license = SUPPORTED_LICENSES.includes(license) ? license : DEFAULT_LICENSE;

  const tags = clean(raw.tags)
    .split(/[,，]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, MAX_TAGS)
    .map((s) => s.slice(0, 24));
  value.tags = tags;

  value.note = clean(raw.note).slice(0, MAX_NOTE);

  return { ok: Object.keys(errors).length === 0, errors, value };
}

/** URL-safe slug from a title, e.g. "Li's HSK 3" -> "li-s-hsk-3". */
export function slugify(input) {
  return String(input || '')
    .toLowerCase()
    .normalize('NFKD')
    // Drop combining marks so "café" -> "cafe" rather than "cafe" + stray accent.
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

/**
 * A slug that does not collide with the published deck index.
 *
 * @param {string} title
 * @param {{slug: string}[]} existing
 */
export function uniqueSlug(title, existing = []) {
  const base = slugify(title) || 'deck';
  const taken = new Set(existing.map((d) => d.slug));
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}

/**
 * Project a validated submission into the `DeckMeta` shape used by
 * `public/decks/index.json`.
 *
 * @param {Record<string, unknown>} value output of `sanitizeSubmission()`
 * @param {{slug: string}[]} existing published decks
 * @param {{submittedBy?: string, issue?: number|string}} [meta]
 */
export function submissionToDeck(value, existing = [], meta = {}) {
  const downloads = [];
  if (value.downloadUrl) {
    downloads.push({
      url: value.downloadUrl,
      ...(value.downloadLabel ? { label: value.downloadLabel } : {}),
      ...(value.downloadNote ? { note: value.downloadNote } : {}),
    });
  }
  if (value.extraDownloadUrl) {
    downloads.push({
      url: value.extraDownloadUrl,
      ...(value.extraDownloadLabel ? { label: value.extraDownloadLabel } : {}),
    });
  }

  const deck = {
    slug: uniqueSlug(value.title, existing),
    title: value.title,
    subtitle: value.subtitle,
    description: value.subtitle,
    tags: value.tags ?? [],
    language: value.language,
    license: value.license,
    cover: value.coverUrl || '',
    downloads,
    previewFile: value.previewUrl || '',
    content: value.content || '',
    featured: false,
    updated: new Date().toISOString().slice(0, 10),
  };

  if (value.authorName) {
    deck.author = value.authorUrl
      ? { name: value.authorName, url: value.authorUrl }
      : { name: value.authorName };
  }
  if (meta.submittedBy || meta.issue) {
    deck.submission = {
      ...(meta.issue ? { issue: Number(meta.issue) } : {}),
      ...(meta.submittedBy ? { submittedBy: meta.submittedBy } : {}),
      approvedAt: new Date().toISOString().slice(0, 10),
    };
  }
  return deck;
}
