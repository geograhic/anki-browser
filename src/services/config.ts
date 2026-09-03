/**
 * Where the moderation API lives.
 *
 * Relative and same-origin on purpose: the Cloudflare Worker owns
 * `/anki-browser/api/*`, so the app needs no CORS preflight and no
 * environment-specific host. Override with `VITE_API_BASE` when developing
 * against a wrangler dev server.
 */
export const API_BASE: string = (import.meta as any).env?.VITE_API_BASE ?? '/anki-browser/api';

/** Public origin of the site — used to build absolute URLs for redirects. */
export const SITE_ORIGIN: string = location.origin;
