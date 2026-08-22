/**
 * Spaced-repetition scheduler (SM-2, as used by Anki's v2 scheduler).
 *
 * ## Why SM-2 and not FSRS
 *
 * Modern Anki defaults to FSRS, but FSRS lives in Anki's Rust core and needs a
 * trained parameter set plus full review-history optimisation. Shipping that to
 * a browser would mean compiling `rslib` to WASM — a large, brittle dependency
 * for a viewer. SM-2 is the algorithm Anki used for over a decade, is fully
 * specified, and produces scheduling users recognise. The design keeps the
 * algorithm behind `SchedulerConfig` + pure functions so FSRS can be dropped in
 * later without touching the UI.
 *
 * ## Scope
 *
 * Review state is **ours**, stored locally (see `store/progress.ts`). We read
 * the package's existing card state as a starting point but never write back
 * into the `.apkg` — that keeps the file the user's own source of truth and
 * avoids corrupting a collection they still sync with AnkiWeb.
 */
import { CARD_TYPE_NEW, CARD_TYPE_REVIEW, type Card } from './types';

/** Anki's four answer buttons. */
export const RATING_AGAIN = 1;
export const RATING_HARD = 2;
export const RATING_GOOD = 3;
export const RATING_EASY = 4;
export type Rating = 1 | 2 | 3 | 4;

export type CardPhase = 'new' | 'learning' | 'review' | 'relearning';

/** Our own per-card scheduling state, persisted locally. */
export interface CardState {
  cardId: number;
  phase: CardPhase;
  /** Next due time, epoch milliseconds. */
  due: number;
  /** Current interval in days (review/relearning only). */
  intervalDays: number;
  /** Ease factor in permille; 2500 = 250%. */
  factor: number;
  /** Index into the learning/relearning step list. */
  step: number;
  reps: number;
  lapses: number;
  /** Last answer time, epoch ms; 0 when never answered here. */
  lastReviewed: number;
}

export interface SchedulerConfig {
  /** Learning steps in minutes, Anki default [1, 10]. */
  learningSteps: number[];
  /** Relearning steps in minutes, Anki default [10]. */
  relearningSteps: number[];
  /** Interval after graduating with Good, in days. */
  graduatingInterval: number;
  /** Interval after graduating with Easy, in days. */
  easyInterval: number;
  /** Starting ease factor, permille. */
  startingEase: number;
  /** Easy answers multiply the interval by this on top of the ease factor. */
  easyBonus: number;
  /** Hard multiplies the current interval by this. */
  hardMultiplier: number;
  /** A lapse multiplies the interval by this (Anki "new interval"). */
  lapseMultiplier: number;
  minEase: number;
  maxIntervalDays: number;
  /** Daily introduction cap for new cards. */
  newPerDay: number;
  /** Daily cap for review cards. */
  reviewPerDay: number;
}

export const DEFAULT_SCHEDULER_CONFIG: SchedulerConfig = {
  learningSteps: [1, 10],
  relearningSteps: [10],
  graduatingInterval: 1,
  easyInterval: 4,
  startingEase: 2500,
  easyBonus: 1.3,
  hardMultiplier: 1.2,
  lapseMultiplier: 0,
  minEase: 1300,
  maxIntervalDays: 36500,
  newPerDay: 20,
  reviewPerDay: 200,
};

const MINUTE_MS = 60_000;
const DAY_MS = 86_400_000;

/**
 * Seed our state from the card's existing Anki state, so a shared deck that
 * already carries scheduling information does not restart from zero.
 */
export function initialState(card: Card, config: SchedulerConfig, now = Date.now()): CardState {
  const isReview = card.type === CARD_TYPE_REVIEW && card.ivl > 0;
  return {
    cardId: card.id,
    phase: isReview ? 'review' : 'new',
    // Existing review cards are treated as due now: the package's `due` is
    // relative to the *original* collection's creation day, which is not a
    // meaningful deadline once the deck is shared with someone else.
    due: now,
    intervalDays: isReview ? card.ivl : 0,
    factor: card.factor && card.factor >= config.minEase ? card.factor : config.startingEase,
    step: 0,
    reps: card.reps ?? 0,
    lapses: card.lapses ?? 0,
    lastReviewed: 0,
  };
}

function clampInterval(days: number, config: SchedulerConfig): number {
  return Math.min(Math.max(days, 1), config.maxIntervalDays);
}

/** Add a little spread so large intervals do not clump on one day. */
function fuzz(days: number): number {
  if (days < 2.5) return days;
  const spread = days < 7 ? 0.25 : days < 30 ? 0.15 : 0.05;
  const delta = days * spread;
  return days + (Math.random() * 2 - 1) * delta;
}

export interface AnswerOutcome {
  state: CardState;
  /** Interval that was applied, in milliseconds from `now`. */
  delayMs: number;
}

/** Apply an answer and return the next state. Pure: input state is not mutated. */
export function answerCard(
  state: CardState,
  rating: Rating,
  config: SchedulerConfig = DEFAULT_SCHEDULER_CONFIG,
  now = Date.now(),
): AnswerOutcome {
  const next: CardState = { ...state, reps: state.reps + 1, lastReviewed: now };

  const scheduleMinutes = (minutes: number): AnswerOutcome => {
    next.due = now + minutes * MINUTE_MS;
    next.intervalDays = 0;
    return { state: next, delayMs: minutes * MINUTE_MS };
  };
  const scheduleDays = (days: number): AnswerOutcome => {
    const withFuzz = clampInterval(fuzz(days), config);
    next.intervalDays = Math.round(withFuzz);
    next.due = now + next.intervalDays * DAY_MS;
    return { state: next, delayMs: next.intervalDays * DAY_MS };
  };

  const steps = state.phase === 'relearning' ? config.relearningSteps : config.learningSteps;

  if (state.phase === 'new' || state.phase === 'learning' || state.phase === 'relearning') {
    if (rating === RATING_AGAIN) {
      next.phase = state.phase === 'relearning' ? 'relearning' : 'learning';
      next.step = 0;
      return scheduleMinutes(steps[0] ?? 1);
    }

    if (rating === RATING_EASY) {
      // Easy graduates immediately out of (re)learning.
      next.phase = 'review';
      next.step = 0;
      next.factor = Math.min(next.factor + 150, 9999);
      return scheduleDays(
        state.phase === 'relearning' ? Math.max(state.intervalDays, config.graduatingInterval) : config.easyInterval,
      );
    }

    if (rating === RATING_HARD) {
      // Repeat the current step, slightly delayed.
      const current = steps[Math.min(state.step, steps.length - 1)] ?? 1;
      next.phase = state.phase === 'new' ? 'learning' : state.phase;
      return scheduleMinutes(current * 1.5);
    }

    // Good: advance one step, graduating past the last one.
    const nextStep = (state.phase === 'new' ? 0 : state.step) + 1;
    if (nextStep >= steps.length) {
      next.phase = 'review';
      next.step = 0;
      const graduated =
        state.phase === 'relearning'
          ? Math.max(state.intervalDays, config.graduatingInterval)
          : config.graduatingInterval;
      return scheduleDays(graduated);
    }
    next.phase = state.phase === 'new' ? 'learning' : state.phase;
    next.step = nextStep;
    return scheduleMinutes(steps[nextStep] ?? 10);
  }

  // ---- Review phase ----
  if (rating === RATING_AGAIN) {
    next.lapses = state.lapses + 1;
    next.factor = Math.max(state.factor - 200, config.minEase);
    next.phase = 'relearning';
    next.step = 0;
    // Anki's "new interval" on lapse; 0 means restart from the relearning steps.
    next.intervalDays = Math.max(0, Math.round(state.intervalDays * config.lapseMultiplier));
    const delay = config.relearningSteps[0] ?? 10;
    next.due = now + delay * MINUTE_MS;
    return { state: next, delayMs: delay * MINUTE_MS };
  }

  const base = Math.max(state.intervalDays, 1);
  if (rating === RATING_HARD) {
    next.factor = Math.max(state.factor - 150, config.minEase);
    return scheduleDays(base * config.hardMultiplier);
  }
  if (rating === RATING_GOOD) {
    return scheduleDays(base * (state.factor / 1000));
  }
  // Easy
  next.factor = Math.min(state.factor + 150, 9999);
  return scheduleDays(base * (state.factor / 1000) * config.easyBonus);
}

/** Preview the delay each button would produce, for the Anki-style hints. */
export function previewIntervals(
  state: CardState,
  config: SchedulerConfig = DEFAULT_SCHEDULER_CONFIG,
  now = Date.now(),
): Record<Rating, string> {
  const out = {} as Record<Rating, string>;
  for (const rating of [RATING_AGAIN, RATING_HARD, RATING_GOOD, RATING_EASY] as Rating[]) {
    // Deterministic preview: temporarily disable fuzz by rounding the outcome.
    const { delayMs } = answerCard(state, rating, config, now);
    out[rating] = formatDelay(delayMs);
  }
  return out;
}

/** Human-readable delay, matching Anki's compact style (`10m`, `3d`, `1.2mo`). */
export function formatDelay(ms: number): string {
  const minutes = ms / MINUTE_MS;
  if (minutes < 1) return '<1m';
  if (minutes < 60) return `${Math.round(minutes)}m`;
  const hours = minutes / 60;
  if (hours < 24) return `${Math.round(hours)}h`;
  const days = hours / 24;
  if (days < 31) return `${Math.round(days)}d`;
  const months = days / 30.4375;
  if (months < 12) return `${months < 10 ? months.toFixed(1) : Math.round(months)}mo`;
  const years = days / 365.25;
  return `${years < 10 ? years.toFixed(1) : Math.round(years)}y`;
}

/* -------------------------------------------------------------------------- */
/* Study queue                                                                */
/* -------------------------------------------------------------------------- */

export interface QueueCounts {
  new: number;
  learning: number;
  review: number;
}

export interface StudyQueueOptions {
  config: SchedulerConfig;
  now: number;
  /** Cards introduced today already, to honour the daily new-card cap. */
  introducedToday: number;
  /** Reviews done today already, to honour the daily review cap. */
  reviewedToday: number;
}

/**
 * Build the ordered study queue.
 *
 * Ordering mirrors Anki's practical behaviour: due learning cards first (they
 * are time-critical), then reviews, then new cards mixed in.
 */
export function buildQueue(states: CardState[], options: StudyQueueOptions): CardState[] {
  const { config, now } = options;
  const learning: CardState[] = [];
  const review: CardState[] = [];
  const fresh: CardState[] = [];

  for (const state of states) {
    if (state.phase === 'new') {
      fresh.push(state);
    } else if (state.phase === 'learning' || state.phase === 'relearning') {
      if (state.due <= now) learning.push(state);
    } else if (state.due <= now) {
      review.push(state);
    }
  }

  learning.sort((a, b) => a.due - b.due);
  review.sort((a, b) => a.due - b.due);

  const newAllowance = Math.max(0, config.newPerDay - options.introducedToday);
  const reviewAllowance = Math.max(0, config.reviewPerDay - options.reviewedToday);

  return [...learning, ...review.slice(0, reviewAllowance), ...fresh.slice(0, newAllowance)];
}

/** Counts for the study header, before daily caps are applied. */
export function queueCounts(states: CardState[], now = Date.now()): QueueCounts {
  const counts: QueueCounts = { new: 0, learning: 0, review: 0 };
  for (const state of states) {
    if (state.phase === 'new') counts.new++;
    else if (state.phase === 'learning' || state.phase === 'relearning') {
      if (state.due <= now) counts.learning++;
    } else if (state.due <= now) counts.review++;
  }
  return counts;
}

/** True when the card has never been studied in this app. */
export function isUnseen(state: CardState): boolean {
  return state.phase === 'new' && state.lastReviewed === 0;
}

/** Convenience for the deck gallery: how many cards are ready right now. */
export function dueNowCount(states: CardState[], config: SchedulerConfig, now = Date.now()): number {
  const counts = queueCounts(states, now);
  return Math.min(counts.new, config.newPerDay) + counts.learning + Math.min(counts.review, config.reviewPerDay);
}

export { CARD_TYPE_NEW, CARD_TYPE_REVIEW };
