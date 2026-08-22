/**
 * Cloudflare Worker: reverse-proxy apps.endril.com/anki-browser/* -> Vercel.
 *
 * Classic Service Worker format (addEventListener), NOT `export default` — the
 * Cloudflare upload API parses this as classic and `export default` would fail
 * with error 10021 "Unexpected token 'export'".
 *
 * The Anki Browser app is built with absolute base `/anki-browser/`, so every
 * asset/request carries that prefix; we strip it before proxying to Vercel and
 * Vercel serves the file at its root. The Host header is rewritten to the
 * Vercel host so Vercel routes the request to the correct deployment.
 */
const TARGET = 'https://anki-browser.vercel.app';
const PREFIX = '/anki-browser';

async function handle(request) {
  const url = new URL(request.url);

  // /anki-browser  ->  /anki-browser/  (canonical trailing slash)
  if (url.pathname === PREFIX) {
    return Response.redirect(url.origin + PREFIX + '/', 308);
  }

  // Strip the /anki-browser prefix; everything after it is the Vercel path.
  let tp = url.pathname.startsWith(PREFIX + '/')
    ? url.pathname.slice(PREFIX.length)
    : url.pathname.startsWith(PREFIX)
      ? '/'
      : url.pathname;
  if (!tp || tp === '') tp = '/';

  const headers = new Headers(request.headers);
  // CRITICAL: Vercel decides which deployment to serve from the Host header.
  // Rewrite it to the Vercel host and drop CF-internal headers.
  headers.delete('host');
  headers.delete('cf-ray');
  headers.delete('cf-connecting-ip');

  return fetch(TARGET + tp + url.search, {
    method: request.method,
    headers,
    body: request.body,
    redirect: 'follow',
  });
}

addEventListener('fetch', (event) => {
  event.respondWith(handle(event.request));
});
