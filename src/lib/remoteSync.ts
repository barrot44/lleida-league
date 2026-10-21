import type { LeagueData } from '@/types';
import { SUPABASE_TABLE, getSupabase, supabaseEnabled, supabaseRest } from '@/lib/supabase';

/**
 * Remote persistence on Supabase. The whole league is one JSON row (`id = 'main'`).
 *  - Reading uses plain `fetch` (anonymous, tiny, no SDK).
 *  - Writing goes through the SDK as the signed-in admin and uses optimistic concurrency:
 *    an update only succeeds if `updated_at` still equals the version we last read.
 */
export const remoteEnabled = supabaseEnabled;

export interface RemoteSnapshot {
  data: LeagueData;
  updatedAt: string;
}

export type PushOutcome = { status: 'ok'; updatedAt: string } | { status: 'conflict' } | { status: 'error'; message: string };

const readHeaders = () => ({ apikey: supabaseRest.key ?? '', Authorization: `Bearer ${supabaseRest.key ?? ''}` });
const rowUrl = (select: string) => `${supabaseRest.url}/rest/v1/${SUPABASE_TABLE}?id=eq.main&select=${select}`;

export async function pullRemote(): Promise<RemoteSnapshot | null> {
  if (!remoteEnabled) return null;
  const res = await fetch(rowUrl('data,updated_at'), { headers: readHeaders(), cache: 'no-store' });
  if (!res.ok) throw new Error(`Supabase: lectura fallida (${res.status})`);
  const rows = (await res.json()) as { data: LeagueData; updated_at: string }[];
  return rows[0] ? { data: rows[0].data, updatedAt: rows[0].updated_at } : null;
}

export async function pullRemoteVersion(): Promise<string | null> {
  if (!remoteEnabled) return null;
  const res = await fetch(rowUrl('updated_at'), { headers: readHeaders(), cache: 'no-store' });
  if (!res.ok) throw new Error(`Supabase: lectura fallida (${res.status})`);
  const rows = (await res.json()) as { updated_at: string }[];
  return rows[0]?.updated_at ?? null;
}

const versionOf = (rows: unknown): string => (rows as { updated_at: string }[])[0].updated_at;

/** Saves `data`. `expected` is the version we last saw (`null` = the row should not exist yet). */
export async function pushRemote(data: LeagueData, expected: string | null): Promise<PushOutcome> {
  try {
    const sb = await getSupabase();
    if (expected === null) {
      const { data: rows, error } = await sb.from(SUPABASE_TABLE).insert({ id: 'main', data }).select('updated_at');
      if (error) return error.code === '23505' ? { status: 'conflict' } : { status: 'error', message: error.message };
      return { status: 'ok', updatedAt: versionOf(rows) };
    }
    const { data: rows, error } = await sb.from(SUPABASE_TABLE).update({ data }).eq('id', 'main').eq('updated_at', expected).select('updated_at');
    if (error) return { status: 'error', message: error.message };
    if (!rows || rows.length === 0) return { status: 'conflict' };
    return { status: 'ok', updatedAt: versionOf(rows) };
  } catch (e) {
    return { status: 'error', message: e instanceof Error ? e.message : 'Error de connexió.' };
  }
}

/** Overwrites the remote copy regardless of its version (explicit admin action). */
export async function forcePushRemote(data: LeagueData): Promise<PushOutcome> {
  try {
    const sb = await getSupabase();
    const { data: rows, error } = await sb.from(SUPABASE_TABLE).upsert({ id: 'main', data }).select('updated_at');
    if (error) return { status: 'error', message: error.message };
    return { status: 'ok', updatedAt: versionOf(rows) };
  } catch (e) {
    return { status: 'error', message: e instanceof Error ? e.message : 'Error de connexió.' };
  }
}
