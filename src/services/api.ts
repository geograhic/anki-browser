/**
 * Thin JSON client for the moderation API.
 *
 * Sessions ride on an HttpOnly cookie set by the Worker, so every call must
 * send credentials. Failures are normalised into `ApiError` so pages can show
 * a translated message without caring whether the network, the Worker or
 * GitHub was the thing that broke.
 */
import { API_BASE } from './config';

export class ApiError extends Error {
  /** Machine-readable code, e.g. 'unauthorized' | 'rate_limited' | 'validation'. */
  code: string;
  status: number;
  /** Per-field error keys from shared validation (relative to `submit.*`). */
  fields?: Record<string, string>;

  constructor(message: string, status = 0, code = 'error', fields?: Record<string, string>) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(API_BASE + path, {
      credentials: 'include',
      headers: { Accept: 'application/json', ...(init.headers ?? {}) },
      ...init,
    });
  } catch {
    // Offline, DNS failure, or the API route is not deployed yet.
    throw new ApiError('network', 0, 'network');
  }

  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }

  if (!res.ok) {
    const body = (data ?? {}) as { error?: string; message?: string; fields?: Record<string, string> };
    throw new ApiError(
      body.error ?? body.message ?? `HTTP ${res.status}`,
      res.status,
      body.error ?? 'error',
      body.fields,
    );
  }
  return data as T;
}

export function apiGet<T>(path: string): Promise<T> {
  return request<T>(path);
}

export function apiPost<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}
