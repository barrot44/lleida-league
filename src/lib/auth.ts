import { DEFAULT_ADMIN_PASSWORD } from '@/config/site';

const PASS_KEY = 'lleida-league:admin-pass';
const SESSION_KEY = 'lleida-league:admin-session';

/**
 * ⚠️ This is only a UI gate for a 100% client-side app: anyone with the browser dev tools can bypass it.
 * For real protection connect a backend (e.g. Supabase Auth + Row Level Security).
 */
export function getAdminPassword(): string {
  try {
    return localStorage.getItem(PASS_KEY) || DEFAULT_ADMIN_PASSWORD;
  } catch {
    return DEFAULT_ADMIN_PASSWORD;
  }
}

export function setAdminPassword(password: string) {
  try {
    localStorage.setItem(PASS_KEY, password);
  } catch {
    /* storage unavailable */
  }
}

export function isAdminSession(): boolean {
  try {
    return sessionStorage.getItem(SESSION_KEY) === '1';
  } catch {
    return false;
  }
}

export function setAdminSession(on: boolean) {
  try {
    if (on) sessionStorage.setItem(SESSION_KEY, '1');
    else sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* storage unavailable */
  }
}
