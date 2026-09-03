/**
 * GitHub session state.
 *
 * The app never sees a token: the Worker exchanges the OAuth code and keeps the
 * result in an HttpOnly cookie. Everything here reads or clears that session.
 */
import { API_BASE } from './config';
import { apiGet, apiPost } from './api';

export interface SessionUser {
  login: string;
  avatarUrl: string;
  htmlUrl: string;
  isAdmin: boolean;
}

export interface Session {
  user: SessionUser | null;
  /** False when the API is unreachable — pages degrade instead of crashing. */
  available: boolean;
}

/**
 * Start the OAuth dance. `next` must be a path under the app so the Worker can
 * validate it and refuse open redirects.
 */
export function oauthStartUrl(next?: string): string {
  const target = next ?? location.pathname + location.hash;
  return `${API_BASE}/oauth/login?next=${encodeURIComponent(target)}`;
}

export async function fetchSession(): Promise<Session> {
  try {
    const data = await apiGet<{ user: SessionUser | null }>('/session');
    return { user: data.user ?? null, available: true };
  } catch {
    return { user: null, available: false };
  }
}

export async function logout(): Promise<void> {
  await apiPost('/logout');
}

/** Signed-in user, or null. */
export async function currentUser(): Promise<SessionUser | null> {
  const s = await fetchSession();
  return s.user;
}
