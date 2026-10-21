import type { LeagueData } from '@/types';

/**
 * Optional Supabase sync (no SDK needed, plain PostgREST over fetch).
 * Enabled only when VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are defined in `.env`.
 * The whole league is stored as a single JSON row (`id = 'main'`). See README for the SQL.
 */
const URL_BASE = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, '');
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const TABLE = import.meta.env.VITE_SUPABASE_TABLE || 'league_state';

export const remoteEnabled = Boolean(URL_BASE && KEY);

const headers = (extra: Record<string, string> = {}) => ({
  apikey: KEY ?? '',
  Authorization: `Bearer ${KEY ?? ''}`,
  'Content-Type': 'application/json',
  ...extra,
});

export async function pullRemote(): Promise<LeagueData | null> {
  if (!remoteEnabled) return null;
  const res = await fetch(`${URL_BASE}/rest/v1/${TABLE}?id=eq.main&select=data`, { headers: headers() });
  if (!res.ok) throw new Error(`Supabase pull failed (${res.status})`);
  const rows = (await res.json()) as { data: LeagueData }[];
  return rows[0]?.data ?? null;
}

export async function pushRemote(data: LeagueData): Promise<void> {
  if (!remoteEnabled) return;
  const res = await fetch(`${URL_BASE}/rest/v1/${TABLE}`, {
    method: 'POST',
    headers: headers({ Prefer: 'resolution=merge-duplicates,return=minimal' }),
    body: JSON.stringify({ id: 'main', data, updated_at: new Date().toISOString() }),
  });
  if (!res.ok) throw new Error(`Supabase push failed (${res.status})`);
}
