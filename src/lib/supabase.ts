import type { SupabaseClient } from '@supabase/supabase-js';

const URL_BASE = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, '');
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const SUPABASE_TABLE = import.meta.env.VITE_SUPABASE_TABLE || 'league_state';
export const supabaseEnabled = Boolean(URL_BASE && KEY);
export const supabaseRest = { url: URL_BASE, key: KEY };

let clientPromise: Promise<SupabaseClient> | null = null;

/** The SDK is only downloaded when someone actually needs it (admin login / writes). */
export function getSupabase(): Promise<SupabaseClient> {
  if (!supabaseEnabled || !URL_BASE || !KEY) return Promise.reject(new Error('Supabase no està configurat.'));
  clientPromise ??= import('@supabase/supabase-js').then(({ createClient }) =>
    createClient(URL_BASE, KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } }),
  );
  return clientPromise;
}

/** Cheap check (no SDK download): is there a persisted Supabase session in this browser? */
export function hasStoredSession(): boolean {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && /^sb-.+-auth-token$/.test(k)) return true;
    }
  } catch {
    /* storage unavailable */
  }
  return false;
}

export type AuthResult = { ok: true; email: string } | { ok: false; error: string };

async function checkAdmin(sb: SupabaseClient): Promise<boolean> {
  const { data, error } = await sb.rpc('is_admin');
  return !error && data === true;
}

/** Turns SDK/network messages into something a league organizer can act on. */
function friendlyError(message: string | undefined): string {
  const m = (message ?? '').toLowerCase();
  if (m.includes('invalid login') || m.includes('invalid credentials')) return 'Correu o contrasenya incorrectes.';
  if (m.includes('fetch') || m.includes('network') || m.includes('connect')) return 'No s’ha pogut connectar amb el servidor. Revisa la connexió i la configuració de Supabase.';
  if (m.includes('email not confirmed')) return 'El correu encara no està confirmat. Confirma’l a Supabase (Authentication → Users).';
  return message || 'No s’ha pogut iniciar la sessió.';
}

export async function signInAdmin(email: string, password: string): Promise<AuthResult> {
  try {
    const sb = await getSupabase();
    const { data, error } = await sb.auth.signInWithPassword({ email: email.trim(), password });
    if (error || !data.user) return { ok: false, error: friendlyError(error?.message) };
    if (!(await checkAdmin(sb))) {
      await sb.auth.signOut();
      return { ok: false, error: 'Aquest usuari no té permisos d’administrador.' };
    }
    return { ok: true, email: data.user.email ?? email };
  } catch (e) {
    return { ok: false, error: friendlyError(e instanceof Error ? e.message : undefined) };
  }
}

/** Restores a previous session (if any) and verifies it still belongs to an admin. */
export async function restoreAdminSession(onSignedOut: () => void): Promise<string | null> {
  try {
    const sb = await getSupabase();
    sb.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') onSignedOut();
    });
    const { data } = await sb.auth.getSession();
    if (!data.session) return null;
    return (await checkAdmin(sb)) ? (data.session.user.email ?? '') : null;
  } catch {
    return null;
  }
}

export async function signOutAdmin() {
  try {
    const sb = await getSupabase();
    await sb.auth.signOut();
  } catch {
    /* already signed out / offline */
  }
}

export async function changeAdminPassword(password: string): Promise<string | null> {
  try {
    const sb = await getSupabase();
    const { error } = await sb.auth.updateUser({ password });
    return error ? error.message : null;
  } catch (e) {
    return e instanceof Error ? e.message : 'Error de connexió.';
  }
}
