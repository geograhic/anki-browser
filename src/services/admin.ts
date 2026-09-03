/**
 * Moderation API (site-owner side).
 *
 * Every mutating call is authorised inside the Worker by comparing the session's
 * GitHub login against the moderator allowlist — the browser is never trusted
 * to decide who is an admin, it only learns the answer.
 */
import { apiGet, apiPost } from './api';
import type { DeckMeta } from '../content/render.mjs';

export type ModerateAction = 'approve' | 'reject' | 'unpublish';

export interface AdminSubmission {
  number: number;
  title: string;
  htmlUrl: string;
  state: 'open' | 'closed';
  status: 'pending' | 'approved' | 'rejected' | 'other';
  createdAt: string;
  updatedAt: string;
  submittedBy: string;
  deckSlug?: string;
  lastComment?: { author: string; body: string; htmlUrl: string; createdAt: string };
  /** Parsed submission payload, for rendering a review card. */
  payload?: Record<string, unknown>;
}

export interface AdminOverview {
  submissions: AdminSubmission[];
  decks: DeckMeta[];
  moderator: string;
}

export interface ModerateResult {
  ok: boolean;
  message?: string;
  deckUrl?: string;
  commit?: string;
}

export function fetchOverview(): Promise<AdminOverview> {
  return apiGet<AdminOverview>('/admin/overview');
}

export function moderate(input: {
  number?: number;
  slug?: string;
  action: ModerateAction;
  reason?: string;
}): Promise<ModerateResult> {
  return apiPost<ModerateResult>('/admin/moderate', input);
}
