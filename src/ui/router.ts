/**
 * Hash + pathname router.
 *
 * In-app navigation uses hash routes (`#/deck/foo`) for smooth client-side
 * transitions. The SEO prerender also emits real path-based pages
 * (`/anki-browser/deck/foo/`); when one of those is loaded directly the router
 * reads `location.pathname` so the SPA renders the same route without a mismatch.
 */

export interface Route {
  segments: string[];
  query: URLSearchParams;
}

function basePath(): string {
  // Vite injects the configured base; falls back to a sensible default.
  const b = (import.meta as any).env?.BASE_URL as string | undefined;
  return b && b.startsWith('/') ? b : '/anki-browser/';
}

export function currentRoute(): Route {
  let raw: string;

  if (location.hash.startsWith('#/')) {
    raw = location.hash.slice(1);
  } else {
    const path = location.pathname || '/';
    const base = basePath();
    raw = path.startsWith(base) ? path.slice(base.length - 0) : path; // keep leading /
    raw = path.startsWith(base) ? path.slice(base.length) : raw;
    if (!raw.startsWith('/')) raw = '/' + raw;
  }

  const [pathPart, queryPart] = raw.split('?');
  const segments = (pathPart || '/').split('/').filter(Boolean);
  const query = new URLSearchParams(queryPart ?? '');
  return { segments, query };
}

export function navigate(hash: string): void {
  const target = hash.startsWith('#') ? hash : '#' + hash;
  if (location.hash === target) {
    // Force a re-dispatch even when the hash is unchanged.
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  } else {
    location.hash = target;
  }
}

/** Build a hash route string, e.g. route('deck', 'foo') -> '#/deck/foo'. */
export function routeHash(segments: string[], query?: Record<string, string>): string {
  let h = '#/' + segments.join('/');
  if (query && Object.keys(query).length) {
    const params = new URLSearchParams(query);
    h += '?' + params.toString();
  }
  return h;
}

type Listener = (route: Route) => void;

export function startRouter(onChange: Listener): void {
  const handle = () => onChange(currentRoute());
  window.addEventListener('hashchange', handle);
  window.addEventListener('popstate', handle);
  handle();
}
