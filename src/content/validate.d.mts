export type SubmissionErrors = Record<string, string>;

export type SubmissionValue = {
  title: string;
  downloadUrl: string;
  downloadLabel: string;
  downloadNote: string;
  subtitle: string;
  coverUrl: string;
  previewUrl: string;
  authorName: string;
  authorUrl: string;
  extraDownloadUrl: string;
  extraDownloadLabel: string;
  content: string;
  language: string;
  license: string;
  tags: string[];
  note: string;
};

export declare const DEFAULT_LICENSE: string;
export declare const MAX_TAGS: number;
export declare const MAX_CONTENT: number;
export declare const MAX_NOTE: number;

export declare function sanitizeSubmission(raw: Record<string, unknown>): {
  ok: boolean;
  errors: SubmissionErrors;
  value: SubmissionValue;
};

export declare function slugify(input: string): string;
export declare function uniqueSlug(title: string, existing?: { slug: string }[]): string;

export declare function submissionToDeck(
  value: SubmissionValue,
  existing?: { slug: string }[],
  meta?: { submittedBy?: string; issue?: number | string },
): Record<string, unknown>;
