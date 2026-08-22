/**
 * Anki card template engine.
 *
 * Implements the template language documented at
 * https://docs.ankiweb.net/templates/fields.html and mirrored in Anki's
 * `rslib/src/template.rs` + `rslib/src/cloze.rs`:
 *
 *   {{Field}}                 field replacement
 *   {{filter:Field}}          filter chain, applied right-to-left
 *   {{#Field}}…{{/Field}}     render when non-empty
 *   {{^Field}}…{{/Field}}     render when empty
 *   {{FrontSide}}             the rendered question (answer template only)
 *   {{Tags}} {{Type}} {{Deck}} {{Subdeck}} {{Card}} {{CardFlag}}
 *
 * Supported filters: text, cloze, cloze-only, hint, type, nc, furigana, kana,
 * kanji, tts.
 *
 * This module is deliberately pure `string -> string`. Rewriting `<img src>` /
 * `[sound:…]` to real media URLs is a separate concern handled by `media.ts`,
 * which keeps the engine testable without any browser APIs.
 */
import type { Card, Note, Notetype } from './types';

export type CardSide = 'question' | 'answer';

export interface RenderContext {
  note: Note;
  notetype: Notetype;
  card: Card;
  /** Full deck name, e.g. `Li's Vocabulary::English`. */
  deckName: string;
  /** Rendered question HTML, required to expand `{{FrontSide}}` on the answer. */
  frontSide?: string;
}

/** A `{{type:…}}` request discovered while rendering. */
export interface TypeAnswerRequest {
  field: string;
  expected: string;
  /** `{{type:nc:Field}}` — compare ignoring diacritics/combining marks. */
  ignoreCombining: boolean;
  /** `{{type:cloze:Field}}` — expected value is the elided cloze text. */
  cloze: boolean;
}

export interface RenderResult {
  html: string;
  /** Present when the template contains `{{type:…}}`. */
  typeAnswer?: TypeAnswerRequest;
  /** Field/filter problems worth surfacing without blocking the render. */
  warnings: string[];
}

/* -------------------------------------------------------------------------- */
/* Parsing                                                                    */
/* -------------------------------------------------------------------------- */

type TemplateNode =
  | { kind: 'text'; text: string }
  | { kind: 'replace'; filters: string[]; field: string }
  | { kind: 'section'; negated: boolean; key: string; children: TemplateNode[] };

/** Parse a template into a node tree. Unclosed sections degrade gracefully. */
export function parseTemplate(src: string): TemplateNode[] {
  const root: TemplateNode[] = [];
  const stack: { key: string; nodes: TemplateNode[]; negated: boolean }[] = [];
  let current = root;
  let pos = 0;

  const pushText = (text: string) => {
    if (text) current.push({ kind: 'text', text });
  };

  while (pos < src.length) {
    const open = src.indexOf('{{', pos);
    if (open === -1) {
      pushText(src.slice(pos));
      break;
    }
    pushText(src.slice(pos, open));

    const close = src.indexOf('}}', open + 2);
    if (close === -1) {
      // Stray `{{` — emit literally rather than throwing away the rest.
      pushText(src.slice(open));
      break;
    }

    const inner = src.slice(open + 2, close).trim();
    pos = close + 2;

    if (!inner || inner.startsWith('!')) continue; // empty or comment

    if (inner.startsWith('#') || inner.startsWith('^')) {
      const negated = inner[0] === '^';
      const key = inner.slice(1).trim();
      const nodes: TemplateNode[] = [];
      current.push({ kind: 'section', negated, key, children: nodes });
      stack.push({ key, nodes, negated });
      current = nodes;
      continue;
    }

    if (inner.startsWith('/')) {
      const key = inner.slice(1).trim();
      // Pop to the matching open section; tolerate mismatched names.
      let idx = -1;
      for (let i = stack.length - 1; i >= 0; i--) {
        if (stack[i].key === key) {
          idx = i;
          break;
        }
      }
      if (idx >= 0) {
        stack.length = idx;
        current = idx === 0 ? root : stack[idx - 1].nodes;
        if (stack.length === 0) current = root;
        else current = stack[stack.length - 1].nodes;
      }
      continue;
    }

    const parts = inner.split(':');
    const field = parts.pop() ?? '';
    current.push({ kind: 'replace', filters: parts.map((p) => p.trim()), field: field.trim() });
  }

  return root;
}

/* -------------------------------------------------------------------------- */
/* Cloze handling                                                             */
/* -------------------------------------------------------------------------- */

interface ClozeMatch {
  start: number;
  end: number;
  ordinal: number;
  text: string;
  hint?: string;
}

/**
 * Find top-level `{{cN::text}}` / `{{cN::text::hint}}` occurrences.
 *
 * A hand-written scanner rather than a regex because clozes nest
 * (`{{c1::outer {{c2::inner}}}}`), which a non-greedy regex mis-parses.
 */
export function findClozes(input: string): ClozeMatch[] {
  const out: ClozeMatch[] = [];
  const re = /\{\{c(\d+)::/g;
  let m: RegExpExecArray | null;

  while ((m = re.exec(input))) {
    const start = m.index;
    const ordinal = Number(m[1]);
    let depth = 1;
    let i = start + m[0].length;
    const bodyStart = i;
    // Track `::` positions at depth 1 so the trailing one can act as the hint.
    const separators: number[] = [];

    while (i < input.length && depth > 0) {
      if (input.startsWith('{{', i)) {
        depth++;
        i += 2;
        continue;
      }
      if (input.startsWith('}}', i)) {
        depth--;
        if (depth === 0) break;
        i += 2;
        continue;
      }
      if (depth === 1 && input.startsWith('::', i)) {
        separators.push(i);
        i += 2;
        continue;
      }
      i++;
    }
    if (depth !== 0) continue; // unterminated cloze: ignore

    const body = input.slice(bodyStart, i);
    let text = body;
    let hint: string | undefined;
    if (separators.length > 0) {
      const rel = separators[separators.length - 1] - bodyStart;
      text = body.slice(0, rel);
      hint = body.slice(rel + 2);
    }

    out.push({ start, end: i + 2, ordinal, text, hint });
    re.lastIndex = i + 2;
  }
  return out;
}

/** Every cloze ordinal present in a field value. */
export function clozeOrdinals(input: string): Set<number> {
  const out = new Set<number>();
  for (const c of findClozes(input)) out.add(c.ordinal);
  return out;
}

/** Strip cloze markup, keeping the inner text (used for plain-text contexts). */
function stripCloze(input: string): string {
  const matches = findClozes(input);
  if (matches.length === 0) return input;
  let out = '';
  let last = 0;
  for (const m of matches) {
    out += input.slice(last, m.start) + stripCloze(m.text);
    last = m.end;
  }
  return out + input.slice(last);
}

/**
 * Render cloze deletions for one ordinal.
 * Question side hides the active cloze as `[...]` (or `[hint]`); answer side
 * highlights it. Inactive clozes always show their plain text.
 */
export function renderCloze(input: string, ordinal: number, side: CardSide): string {
  const matches = findClozes(input);
  if (matches.length === 0) return input;

  let out = '';
  let last = 0;
  for (const m of matches) {
    out += input.slice(last, m.start);
    const inner = renderCloze(m.text, ordinal, side);
    if (m.ordinal === ordinal) {
      if (side === 'question') {
        const shown = m.hint ? escapeHtml(m.hint) : '...';
        out += `<span class="cloze" data-ordinal="${m.ordinal}">[${shown}]</span>`;
      } else {
        out += `<span class="cloze" data-ordinal="${m.ordinal}">${inner}</span>`;
      }
    } else {
      out += inner;
    }
    last = m.end;
  }
  return out + input.slice(last);
}

/** `cloze-only`: just the elided text for this ordinal (used by tts/type). */
export function clozeOnly(input: string, ordinal: number): string {
  return findClozes(input)
    .filter((m) => m.ordinal === ordinal)
    .map((m) => stripCloze(m.text))
    .join(', ');
}

/* -------------------------------------------------------------------------- */
/* Filters                                                                    */
/* -------------------------------------------------------------------------- */

export function stripHtml(input: string): string {
  return input
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/(p|div|li|tr|h[1-6])>/gi, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Anki ruby syntax: `漢字[かんじ]`. */
const RUBY_RE = /([^\s>]+?)\[(.+?)\]/g;

function furigana(input: string): string {
  return input.replace(RUBY_RE, (_all, base: string, ruby: string) => `<ruby>${base}<rt>${ruby}</rt></ruby>`);
}

function kana(input: string): string {
  return input.replace(RUBY_RE, (_all, _base: string, ruby: string) => ruby);
}

function kanji(input: string): string {
  return input.replace(RUBY_RE, (_all, base: string) => base);
}

let hintSeq = 0;

/** `hint`: a click-to-reveal disclosure, matching Anki's behaviour. */
function hint(value: string, fieldName: string): string {
  if (!value.trim()) return '';
  const id = `hint-${++hintSeq}-${Math.random().toString(36).slice(2, 8)}`;
  return (
    `<a class="hint-link" href="#" data-hint-target="${id}" role="button">` +
    `${escapeHtml(fieldName)} を表示`.replace(' を表示', '') +
    `</a>` +
    `<div class="hint-body" id="${id}" hidden>${value}</div>`
  );
}

/** Best-effort `clickable` filter (mirrors the "Clickable Tags" add-on). */
function renderClickable(value: string, fieldName: string): string {
  if (!value.trim()) return '';
  if (fieldName === 'Tags') {
    const tags = value.split(/\s+/).map((t) => t.trim()).filter(Boolean);
    if (tags.length === 0) return '';
    return tags
      .map((t) => `<a class="tag-chip" href="#" data-tag="${escapeHtml(t)}" role="button">${escapeHtml(t)}</a>`)
      .join(' ');
  }
  return `<span class="clickable" data-field="${escapeHtml(fieldName)}">${value}</span>`;
}

/** Remove `{{tts …}}` output from the visual render (audio is opt-in elsewhere). */
function ttsPlaceholder(): string {
  return '';
}

/* -------------------------------------------------------------------------- */
/* Rendering                                                                  */
/* -------------------------------------------------------------------------- */

const SPECIAL_FIELDS = new Set([
  'FrontSide',
  'Tags',
  'Type',
  'Deck',
  'Subdeck',
  'Card',
  'CardFlag',
]);

class Renderer {
  readonly warnings: string[] = [];
  typeAnswer?: TypeAnswerRequest;
  private readonly fieldsByName = new Map<string, string>();

  constructor(
    private readonly ctx: RenderContext,
    private readonly side: CardSide,
  ) {
    const { notetype, note } = ctx;
    notetype.fields.forEach((f, i) => {
      this.fieldsByName.set(f.name, note.fields[i] ?? '');
    });
  }

  /** Raw value for a template key, or undefined when the key is unknown. */
  private rawValue(key: string): string | undefined {
    if (this.fieldsByName.has(key)) return this.fieldsByName.get(key);

    const { ctx } = this;
    switch (key) {
      case 'FrontSide':
        return ctx.frontSide ?? '';
      case 'Tags':
        return ctx.note.tags.join(' ');
      case 'Type':
        return ctx.notetype.name;
      case 'Deck':
        return ctx.deckName;
      case 'Subdeck':
        return ctx.deckName.split('::').pop() ?? ctx.deckName;
      case 'Card':
        return ctx.notetype.templates.find((t) => t.ord === ctx.card.ord)?.name ?? '';
      case 'CardFlag':
        return '';
      default:
        break;
    }

    // Cloze conditionals: `{{#c1}}` is truthy when ordinal 1 exists on the note.
    const clozeMatch = /^c(\d+)$/.exec(key);
    if (clozeMatch) {
      const ordinal = Number(clozeMatch[1]);
      for (const value of this.fieldsByName.values()) {
        if (clozeOrdinals(value).has(ordinal)) return '1';
      }
      return '';
    }
    return undefined;
  }

  /** Cloze ordinal for the current card (cloze notetypes are 0-indexed by ord). */
  private get clozeOrdinal(): number {
    return this.ctx.card.ord + 1;
  }

  private applyFilters(value: string, filters: string[], fieldName: string): string {
    // Anki applies the chain innermost-first, i.e. right to left.
    let out = value;
    for (let i = filters.length - 1; i >= 0; i--) {
      const filter = filters[i];
      if (!filter) continue;

      if (filter.startsWith('tts')) {
        out = ttsPlaceholder();
        continue;
      }

      switch (filter) {
        case 'text':
          out = stripHtml(out);
          break;
        case 'cloze':
          out = renderCloze(out, this.clozeOrdinal, this.side);
          break;
        case 'cloze-only':
          out = clozeOnly(out, this.clozeOrdinal);
          break;
        case 'furigana':
          out = furigana(out);
          break;
        case 'kana':
          out = kana(out);
          break;
        case 'kanji':
          out = kanji(out);
          break;
        case 'hint':
          out = hint(out, fieldName);
          break;
        case 'nc':
          // Only meaningful together with `type`; handled there.
          break;
        case 'clickable':
          // Best-effort support for the "Clickable Tags" add-on: render the
          // Tags field as clickable chips. On any other field, wrap the value so
          // the stylesheet can show a clickable affordance. We do not wire up
          // the actual click behaviour (filtering) — that is add-on-specific.
          out = renderClickable(out, fieldName);
          break;
        case 'edit':
          // Best-effort support for "Edit Field During Review" style add-ons.
          // A full viewer is read-only, so we surface the field inside a styled,
          // non-editable box rather than silently dropping the content.
          out = `<div class="field-edit" data-field="${escapeHtml(fieldName)}">${out}</div>`;
          break;
        case 'type': {
          const isCloze = filters.includes('cloze');
          const expectedSource = isCloze ? clozeOnly(value, this.clozeOrdinal) : value;
          this.typeAnswer = {
            field: fieldName,
            expected: stripHtml(expectedSource),
            ignoreCombining: filters.includes('nc'),
            cloze: isCloze,
          };
          // The study view replaces this placeholder with a live input/diff.
          out = '<span data-type-answer="1"></span>';
          break;
        }
        default:
          this.warnings.push(`Unknown template filter "${filter}" on field "${fieldName}"`);
          break;
      }
    }
    return out;
  }

  render(nodes: TemplateNode[]): string {
    let out = '';
    for (const node of nodes) {
      if (node.kind === 'text') {
        out += node.text;
        continue;
      }
      if (node.kind === 'section') {
        const raw = this.rawValue(node.key);
        if (raw === undefined) {
          this.warnings.push(`Unknown field "${node.key}" in a conditional block`);
          continue;
        }
        const nonEmpty = stripHtml(stripCloze(raw)).length > 0;
        if (nonEmpty !== node.negated) out += this.render(node.children);
        continue;
      }

      const raw = this.rawValue(node.field);
      if (raw === undefined) {
        this.warnings.push(`Unknown field "${node.field}"`);
        out += `<span class="template-error">{{${node.field}}}</span>`;
        continue;
      }

      // Cloze notetypes imply cloze rendering even without an explicit filter.
      let filters = node.filters;
      if (
        this.ctx.notetype.isCloze &&
        filters.length === 0 &&
        !SPECIAL_FIELDS.has(node.field) &&
        clozeOrdinals(raw).size > 0
      ) {
        filters = ['cloze'];
      }
      out += this.applyFilters(raw, filters, node.field);
    }
    return out;
  }
}

function renderSide(ctx: RenderContext, side: CardSide, template: string): RenderResult {
  const renderer = new Renderer(ctx, side);
  const html = renderer.render(parseTemplate(template));
  return { html, typeAnswer: renderer.typeAnswer, warnings: renderer.warnings };
}

function templateFor(ctx: RenderContext) {
  const { notetype, card } = ctx;
  if (notetype.isCloze) {
    // Cloze notetypes have a single template reused for every ordinal.
    return notetype.templates[0];
  }
  return notetype.templates.find((t) => t.ord === card.ord) ?? notetype.templates[0];
}

/** Render the question side of a card. */
export function renderQuestion(ctx: RenderContext): RenderResult {
  const template = templateFor(ctx);
  if (!template) {
    return { html: '<div class="template-error">This notetype has no card template.</div>', warnings: [] };
  }
  return renderSide(ctx, 'question', template.qfmt);
}

/** Render the answer side of a card. `ctx.frontSide` expands `{{FrontSide}}`. */
export function renderAnswer(ctx: RenderContext): RenderResult {
  const template = templateFor(ctx);
  if (!template) {
    return { html: '<div class="template-error">This notetype has no card template.</div>', warnings: [] };
  }
  return renderSide(ctx, 'answer', template.afmt);
}

/** Convenience: render both sides, wiring `{{FrontSide}}` automatically. */
export function renderCard(ctx: RenderContext): { question: RenderResult; answer: RenderResult } {
  const question = renderQuestion(ctx);
  const answer = renderAnswer({ ...ctx, frontSide: question.html });
  return { question, answer };
}

/**
 * Plain-text preview of a note, used by the card browser and search index.
 * Falls back to the first non-empty field when the sort field is blank.
 */
export function notePreview(note: Note, notetype: Notetype): string {
  const values = notetype.fields.map((_, i) => stripHtml(stripCloze(note.fields[i] ?? '')));
  return values.find((v) => v.length > 0) ?? '';
}
