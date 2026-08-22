/**
 * Media resolution for rendered card HTML.
 *
 * Anki stores media *inside* the package and references it from note fields by
 * bare filename (`<img src="abc.png">`, `[sound:abc.mp3]`). Those references
 * mean nothing to a browser, so after templating we rewrite them to object URLs
 * backed by the bytes we pull out of the package on demand.
 *
 * Object URLs are cached per filename and revoked together via `dispose()`, so
 * flipping through thousands of cards cannot leak blobs.
 */
import type { AnkiPackage } from './ankiPackage';

const MIME_BY_EXTENSION: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  avif: 'image/avif',
  bmp: 'image/bmp',
  ico: 'image/x-icon',
  mp3: 'audio/mpeg',
  ogg: 'audio/ogg',
  oga: 'audio/ogg',
  opus: 'audio/ogg',
  wav: 'audio/wav',
  m4a: 'audio/mp4',
  flac: 'audio/flac',
  aac: 'audio/aac',
  mp4: 'video/mp4',
  webm: 'video/webm',
  mov: 'video/quicktime',
};

function mimeFor(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  return MIME_BY_EXTENSION[ext] ?? 'application/octet-stream';
}

const AUDIO_EXTENSIONS = new Set(['mp3', 'ogg', 'oga', 'opus', 'wav', 'm4a', 'flac', 'aac']);

function isAudio(filename: string): boolean {
  return AUDIO_EXTENSIONS.has(filename.split('.').pop()?.toLowerCase() ?? '');
}

/**
 * Turns in-package media references into usable URLs.
 * One instance per opened package; call `dispose()` when closing it.
 */
export class MediaResolver {
  private readonly urls = new Map<string, string>();
  private readonly missing = new Set<string>();

  constructor(private readonly pkg: AnkiPackage) {}

  /** Filenames referenced by cards but absent from the package. */
  get missingFiles(): string[] {
    return [...this.missing];
  }

  /** Object URL for a media filename, or undefined when it is not in the package. */
  urlFor(filename: string): string | undefined {
    const name = decodeURIComponent(filename.trim()).replace(/^\.\//, '');
    const cached = this.urls.get(name);
    if (cached) return cached;

    const bytes = this.pkg.mediaBytes(name);
    if (!bytes) {
      this.missing.add(name);
      return undefined;
    }
    // Copy into a fresh buffer: the package cache may hand back a subarray view.
    const blob = new Blob([new Uint8Array(bytes)], { type: mimeFor(name) });
    const url = URL.createObjectURL(blob);
    this.urls.set(name, url);
    return url;
  }

  /**
   * Rewrite every media reference in a rendered HTML fragment.
   * Handles `src`/`data-src` attributes and Anki's `[sound:…]` markup.
   */
  resolveHtml(html: string): string {
    let out = this.replaceSoundTags(html);
    out = this.replaceSrcAttributes(out);
    return out;
  }

  /** `[sound:file.mp3]` -> an inline audio player. */
  private replaceSoundTags(html: string): string {
    return html.replace(/\[sound:([^\]]+)\]/g, (_all, filename: string) => {
      const url = this.urlFor(filename);
      if (!url) {
        return `<span class="media-missing" title="Missing media: ${escapeAttr(filename)}">🔇</span>`;
      }
      const tag = isAudio(filename) ? 'audio' : 'video';
      return `<${tag} class="card-media-${tag}" controls preload="none" src="${escapeAttr(url)}"></${tag}>`;
    });
  }

  /** Point `src="abc.png"` at the object URL, leaving real URLs untouched. */
  private replaceSrcAttributes(html: string): string {
    return html.replace(
      /(<(?:img|audio|video|source)\b[^>]*?\ssrc\s*=\s*)(["']?)([^"'\s>]+)\2/gi,
      (all, prefix: string, quote: string, value: string) => {
        if (/^(https?:|data:|blob:|\/\/)/i.test(value)) return all;
        const url = this.urlFor(value);
        if (!url) return all;
        const q = quote || '"';
        return `${prefix}${q}${url}${q}`;
      },
    );
  }

  dispose(): void {
    for (const url of this.urls.values()) URL.revokeObjectURL(url);
    this.urls.clear();
    this.missing.clear();
  }
}

function escapeAttr(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

/**
 * LaTeX in Anki is pre-rendered to images by the desktop app, so a browser
 * cannot reproduce it. Rather than leaking raw markup into the card we surface
 * it as inline code, which is honest and still readable.
 */
export function degradeLatex(html: string): string {
  return html
    .replace(/\[latex\]([\s\S]*?)\[\/latex\]/gi, (_a, body: string) => latexBadge(body))
    .replace(/\[\$\]([\s\S]*?)\[\/\$\]/g, (_a, body: string) => latexBadge(body))
    .replace(/\[\$\$\]([\s\S]*?)\[\/\$\$\]/g, (_a, body: string) => latexBadge(body));
}

function latexBadge(body: string): string {
  return `<code class="latex-fallback" title="LaTeX is rendered by the Anki desktop app; shown as source here">${escapeAttr(
    body.trim(),
  )}</code>`;
}
