import { getSupabase } from '@/lib/supabase';

/** Who can enter the control room (Supabase users listed in `admins`), managed through /api/admins. */

export interface AdminUser {
  email: string;
  since: string;
  /** The admin using this browser. */
  me: boolean;
}

const MESSAGES: Record<string, string> = {
  'missing-service-key': 'Falta la clau SUPABASE_SERVICE_ROLE_KEY a Vercel.',
  'not-admin': 'Torna a iniciar sessió com a administrador.',
  self: 'No et pots treure a tu mateix.',
  last: 'Ha de quedar com a mínim un administrador.',
  'no-user': 'Aquest correu no té compte.',
};

async function adminsApi<T>(body: Record<string, unknown>): Promise<T> {
  const sb = await getSupabase();
  const { data } = await sb.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error(MESSAGES['not-admin']);
  let res: Response;
  try {
    res = await fetch('/api/admins', { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  } catch {
    throw new Error('Sense connexió amb el servidor.');
  }
  const out = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(res.status === 404 && !out.error ? 'Només funciona a la web publicada.' : (MESSAGES[out.error ?? ''] ?? out.error ?? `Error ${res.status}`));
  return out;
}

export const listAdmins = async () => (await adminsApi<{ admins: AdminUser[] }>({ action: 'list' })).admins;

/** Gives admin rights; when the e-mail has no login yet it is created with `password`. */
export const addAdmin = (email: string, password: string) => adminsApi<{ ok: true; created: boolean }>({ action: 'add', email: email.trim().toLowerCase(), password });

export const removeAdmin = (email: string) => adminsApi<{ ok: true }>({ action: 'remove', email });
