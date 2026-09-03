/**
 * Everything a page module needs to render.
 *
 * Pages never touch `location` or localStorage directly — language and links
 * are resolved once in `app.ts` and passed down. That keeps every page pure
 * with respect to its inputs, which is what makes the SEO prerender able to
 * reuse the same builders without shims.
 */
import type { LinkSet } from '../../content/render.mjs';

export interface PageContext {
  /** Resolved UI language for this render. */
  lang: 'en' | 'zh';
  /** `appLinks` localized to `lang` (mirrored routes point at the twin). */
  links: LinkSet;
  /** Route key used by the header language switcher, e.g. `faq` / `zhFaq`. */
  pageKey: string;
  /** Route segments after the optional language prefix has been stripped. */
  segments: string[];
  /** Original query string of the route. */
  query: URLSearchParams;
}
