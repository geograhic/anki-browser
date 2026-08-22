import {
  AnkiPackage,
  MediaResolver,
  renderCard,
  degradeLatex,
  initialState,
  buildQueue,
  answerCard,
  previewIntervals,
  DEFAULT_SCHEDULER_CONFIG,
  type CardState,
  type Rating,
  type Collection,
  type RenderContext,
} from '../core';
import { fingerprint } from './state';
import { loadStates, saveStates } from './storage';

export interface RenderedCard {
  questionHtml: string;
  answerHtml: string;
  cardId: number;
}

/**
 * Drives one study session over an opened package.
 *
 * Card scheduling state lives here and is persisted to IndexedDB (keyed by the
 * deck fingerprint). We never mutate the package; answering only updates our own
 * `CardState` map.
 */
export class StudySession {
  private readonly states = new Map<number, CardState>();
  private readonly cardById = new Map<number, Collection['cards'][number]>();
  private readonly noteById: Collection['notes'];
  private readonly notetypeById: Collection['notetypes'];
  private readonly deckNameById = new Map<number, string>();
  private queue: CardState[] = [];
  private cursor = 0;
  answered = 0;

  private constructor(
    public readonly pkg: AnkiPackage,
    public readonly media: MediaResolver,
    public readonly collection: Collection,
    public readonly name: string,
    public readonly deckKey: string,
  ) {
    this.noteById = collection.notes;
    this.notetypeById = collection.notetypes;
    for (const c of collection.cards) this.cardById.set(c.id, c);
    for (const d of collection.decks) this.deckNameById.set(d.id, d.name);
  }

  static async create(
    pkg: AnkiPackage,
    media: MediaResolver,
    collection: Collection,
    name: string,
    deckKey: string,
  ): Promise<StudySession> {
    const saved = await loadStates(deckKey);
    const savedMap = new Map(saved.map((s) => [s.cardId, s]));
    const session = new StudySession(pkg, media, collection, name, deckKey);
    const now = Date.now();
    for (const card of collection.cards) {
      const init = initialState(card, DEFAULT_SCHEDULER_CONFIG, now);
      session.states.set(card.id, savedMap.get(card.id) ?? init);
    }
    session.rebuild();
    return session;
  }

  get total(): number {
    return this.states.size;
  }

  get remaining(): number {
    return this.queue.length;
  }

  get done(): boolean {
    return this.queue.length === 0;
  }

  get current(): CardState | null {
    return this.queue[this.cursor] ?? null;
  }

  private rebuild(): void {
    const now = Date.now();
    this.queue = buildQueue([...this.states.values()], {
      config: DEFAULT_SCHEDULER_CONFIG,
      now,
      introducedToday: 0,
      reviewedToday: 0,
    });
    this.cursor = 0;
  }

  /** Render the current card's question + answer, with media and LaTeX resolved. */
  renderCurrent(): RenderedCard | null {
    const st = this.current;
    if (!st) return null;
    const card = this.cardById.get(st.cardId);
    if (!card) return null;
    const note = this.noteById.get(card.nid);
    if (!note) return null;
    const notetype = this.notetypeById.get(note.mid);
    if (!notetype) return null;

    const ctx: RenderContext = {
      note,
      notetype,
      card,
      deckName: this.deckNameById.get(card.did) ?? '',
    };
    const res = renderCard(ctx);
    return {
      questionHtml: this.media.resolveHtml(degradeLatex(res.question.html)),
      answerHtml: this.media.resolveHtml(degradeLatex(res.answer.html)),
      cardId: card.id,
    };
  }

  /** Button labels (next-interval previews) for the current card. */
  intervalPreviews(): Record<Rating, string> {
    const st = this.current;
    if (!st) return { 1: '', 2: '', 3: '', 4: '' };
    return previewIntervals(st, DEFAULT_SCHEDULER_CONFIG);
  }

  answer(rating: Rating): void {
    const st = this.current;
    if (!st) return;
    const { state } = answerCard(st, rating, DEFAULT_SCHEDULER_CONFIG);
    this.states.set(st.cardId, state);
    this.answered++;
    void saveStates(this.deckKey, [...this.states.values()]);
    this.rebuild();
  }

  progress(): number {
    return Math.min(100, Math.round((this.answered / (this.answered + this.remaining)) * 100));
  }
}

/** Parse bytes and build a session, wiring up media + progress. */
export async function openPackage(bytes: Uint8Array, name: string): Promise<StudySession> {
  const pkg = await AnkiPackage.open(bytes);
  const media = new MediaResolver(pkg);
  const collection = pkg.collection;
  const deckKey = fingerprint(collection, name);
  return StudySession.create(pkg, media, collection, name, deckKey);
}
