/**
 * Deck submission API (visitor side).
 *
 * Field names match `sanitizeSubmission()` in `src/content/validate.mjs`, which
 * the Worker also uses — so client and server can never disagree about what a
 * valid submission is.
 */
import { apiGet, apiPost } from './api';

export type SubmissionStatus = 'pending' | 'approved' | 'rejected' | 'other';

export interface SubmissionInput {
  title: string;
  downloadUrl: string;
  subtitle: string;
  downloadLabel?: string;
  downloadNote?: string;
  coverUrl?: string;
  previewUrl?: string;
  authorName?: string;
  authorUrl?: string;
  extraDownloadUrl?: string;
  extraDownloadLabel?: string;
  content?: string;
  language?: string;
  license?: string;
  tags?: string;
  note?: string;
}

export interface SubmissionResult {
  number: number;
  htmlUrl: string;
}

export interface ModeratorComment {
  author: string;
  body: string;
  htmlUrl: string;
  createdAt: string;
}

export interface MySubmission {
  number: number;
  title: string;
  htmlUrl: string;
  state: 'open' | 'closed';
  status: SubmissionStatus;
  createdAt: string;
  updatedAt: string;
  /** Slug of the published deck, once approved. */
  deckSlug?: string;
  /** Latest comment by anyone other than the submitter — i.e. moderator feedback. */
  lastComment?: ModeratorComment;
}

export function submitDeck(input: SubmissionInput): Promise<SubmissionResult> {
  return apiPost<SubmissionResult>('/submissions', input);
}

export function mySubmissions(): Promise<{ submissions: MySubmission[] }> {
  return apiGet<{ submissions: MySubmission[] }>('/submissions/mine');
}
