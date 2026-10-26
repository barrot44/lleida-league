import { getSupabase, supabaseEnabled, supabaseRest } from '@/lib/supabase';
import { uid } from '@/lib/utils';

/**
 * Messages from the stands. Anyone sends one (it waits as "pending"); admins read them, approve the good ones and put
 * them on air. Without Supabase they live in this browser (enough to try it out).
 */

export interface FanMessage {
  id: string;
  name: string;
  text: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export const FAN_NAME_MAX = 30;
export const FAN_TEXT_MAX = 140;
const COOLDOWN_MS = 30_000;

const LOCAL = 'lleida-league:fan-messages';
const LAST_SENT = 'lleida-league:fan-last-sent';

function readLocal(): FanMessage[] {
  try {
    return JSON.parse(localStorage.getItem(LOCAL) ?? '[]') as FanMessage[];
  } catch {
    return [];
  }
}

function writeLocal(list: FanMessage[]) {
  try {
    localStorage.setItem(LOCAL, JSON.stringify(list.slice(0, 100)));
  } catch {
    /* storage blocked */
  }
}

/** Seconds to wait before this device can send another message (simple anti-flood). */
export function cooldownLeft(now = Date.now()) {
  try {
    const last = Number(localStorage.getItem(LAST_SENT) ?? 0);
    return Math.max(0, Math.ceil((last + COOLDOWN_MS - now) / 1000));
  } catch {
    return 0;
  }
}

export type SendOutcome = 'ok' | 'wait' | 'invalid' | 'error';

export async function sendFanMessage(name: string, text: string): Promise<SendOutcome> {
  const n = name.trim().slice(0, FAN_NAME_MAX);
  const t = text.trim().replace(/\s+/g, ' ').slice(0, FAN_TEXT_MAX);
  if (!n || t.length < 2) return 'invalid';
  if (cooldownLeft() > 0) return 'wait';
  const msg: FanMessage = { id: uid('fan'), name: n, text: t, status: 'pending', createdAt: new Date().toISOString() };
  try {
    if (!supabaseEnabled) writeLocal([msg, ...readLocal()]);
    else {
      const key = supabaseRest.key ?? '';
      const res = await fetch(`${supabaseRest.url}/rest/v1/fan_messages`, {
        method: 'POST',
        headers: { apikey: key, ...(key.startsWith('eyJ') ? { Authorization: `Bearer ${key}` } : {}), 'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify({ id: msg.id, name: msg.name, text: msg.text }),
      });
      if (!res.ok) return 'error';
    }
    localStorage.setItem(LAST_SENT, String(Date.now()));
    return 'ok';
  } catch {
    return 'error';
  }
}

// ───────────────────────── admin ─────────────────────────

interface Row {
  id: string;
  name: string;
  text: string;
  status: FanMessage['status'];
  created_at: string;
}

export async function listFanMessages(): Promise<FanMessage[]> {
  if (!supabaseEnabled) return readLocal();
  const sb = await getSupabase();
  const { data, error } = await sb.from('fan_messages').select('*').order('created_at', { ascending: false }).limit(60);
  if (error) throw new Error(/does not exist|could not find the table/i.test(error.message) ? 'Falta la taula «fan_messages» a Supabase: executa l’SQL actualitzat.' : error.message);
  return ((data ?? []) as Row[]).map((r) => ({ id: r.id, name: r.name, text: r.text, status: r.status, createdAt: r.created_at }));
}

export async function setFanStatus(id: string, status: FanMessage['status']) {
  if (!supabaseEnabled) return writeLocal(readLocal().map((m) => (m.id === id ? { ...m, status } : m)));
  const sb = await getSupabase();
  const { error } = await sb.from('fan_messages').update({ status }).eq('id', id);
  if (error) throw new Error(error.message);
}

/** Deletes everything already handled (approved or rejected). */
export async function clearHandled() {
  if (!supabaseEnabled) return writeLocal(readLocal().filter((m) => m.status === 'pending'));
  const sb = await getSupabase();
  const { error } = await sb.from('fan_messages').delete().neq('status', 'pending');
  if (error) throw new Error(error.message);
}
