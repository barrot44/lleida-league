import { getSupabase, supabaseEnabled, supabaseRest } from '@/lib/supabase';

/**
 * Push notifications ("avisos al mòbil"). Visitors subscribe from the website / installed app; admins send from the
 * control room through /api/push (a Vercel function that holds the private VAPID key).
 */

export const VAPID_PUBLIC_KEY = (import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined) || 'BLOljxZjIJuZj_8cFWFVqWbFUt5hnbchBmCuLXZLkbhgy8Mu2giFzAY3Ik869CzKn8HUGexsL0VRz3QPVinoZ2Y';

export const pushSupported = () => typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

function keyBytes(b64: string) {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

async function registration() {
  await navigator.serviceWorker.register('/sw.js');
  return navigator.serviceWorker.ready;
}

export async function currentSubscription(): Promise<PushSubscription | null> {
  if (!pushSupported() || Notification.permission !== 'granted') return null;
  const reg = await navigator.serviceWorker.getRegistration();
  return (await reg?.pushManager.getSubscription()) ?? null;
}

const rpc = (name: string, args: Record<string, unknown>) => {
  const key = supabaseRest.key ?? '';
  return fetch(`${supabaseRest.url}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: { apikey: key, ...(key.startsWith('eyJ') ? { Authorization: `Bearer ${key}` } : {}), 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
  });
};

export type SubscribeOutcome = 'ok' | 'denied' | 'unsupported' | 'error';

export async function subscribePush(): Promise<SubscribeOutcome> {
  if (!pushSupported()) return 'unsupported';
  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return 'denied';
    const reg = await registration();
    const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(VAPID_PUBLIC_KEY) }));
    const json = sub.toJSON();
    if (!supabaseEnabled) return 'ok';
    const res = await rpc('push_subscribe', { p_endpoint: json.endpoint, p_p256dh: json.keys?.p256dh, p_auth: json.keys?.auth });
    return res.ok ? 'ok' : 'error';
  } catch {
    return 'error';
  }
}

export async function unsubscribePush() {
  const sub = await currentSubscription();
  if (!sub) return;
  if (supabaseEnabled) await rpc('push_unsubscribe', { p_endpoint: sub.endpoint }).catch(() => {});
  await sub.unsubscribe();
}

export interface PushMessage {
  title: string;
  body?: string;
  url?: string;
  /** Same tag = the new notification replaces the previous one (e.g. the score). */
  tag?: string;
}

/** Admin only: sends a notification to every subscribed phone. Returns how many received it. */
export async function sendPush(msg: PushMessage): Promise<{ sent: number; total: number }> {
  if (!supabaseEnabled) throw new Error('Els avisos necessiten Supabase (en mode local no es poden enviar).');
  const sb = await getSupabase();
  const { data } = await sb.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Torna a iniciar sessió com a administrador.');
  let res: Response;
  try {
    res = await fetch('/api/push', { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(msg) });
  } catch {
    throw new Error('Sense connexió amb el servidor d’avisos.');
  }
  const out = (await res.json().catch(() => ({}))) as { sent?: number; total?: number; error?: string };
  if (!res.ok) {
    const e = out.error;
    throw new Error(
      e === 'missing-vapid'
        ? 'Falta la clau VAPID_PRIVATE_KEY a Vercel (mira el README).'
        : e === 'missing-table'
          ? 'Falta la taula d’avisos a Supabase: executa l’SQL actualitzat.'
          : e === 'not-admin'
            ? 'Només els administradors poden enviar avisos.'
            : res.status === 404
              ? 'El servidor d’avisos no està disponible aquí (només a la web publicada).'
              : (e ?? `Error ${res.status}`),
    );
  }
  return { sent: out.sent ?? 0, total: out.total ?? 0 };
}
