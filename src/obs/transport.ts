import type { ObsState } from '@/obs/types';
import { normalizeObsState } from '@/obs/state';
import { getSupabase, supabaseEnabled, supabaseRest } from '@/lib/supabase';

/**
 * How the admin panel reaches the overlay inside OBS:
 *  - Supabase (production): one row `obs_state` (id = 'main'). The admin upserts it; the overlay gets every change
 *    through Realtime in well under a second, with polling as a safety net. Works across devices (phone → PC).
 *  - Same browser (local mode, or the preview): BroadcastChannel + localStorage, instant and offline.
 * Every copy carries `ts`; receivers only keep newer copies, so the sources can be mixed freely.
 */

export const OBS_TABLE = 'obs_state';
const LOCAL_KEY = 'lleida-league:obs';
const CHANNEL_NAME = 'lleida-league-obs';

export const obsRemoteEnabled = supabaseEnabled;

export type ReadStatus = 'local' | 'connecting' | 'realtime' | 'polling' | 'error';
export type WriteStatus = 'idle' | 'saving' | 'ok' | 'error';

let channel: BroadcastChannel | null | undefined;
const getChannel = () => {
  if (channel === undefined) channel = typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel(CHANNEL_NAME);
  return channel;
};

function readLocal(): ObsState | null {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    return raw ? normalizeObsState(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

function writeLocal(state: ObsState) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(state));
  } catch {
    /* storage full or blocked: the BroadcastChannel still delivers it */
  }
}

const readHeaders = (): Record<string, string> => {
  const key = supabaseRest.key ?? '';
  return key.startsWith('eyJ') ? { apikey: key, Authorization: `Bearer ${key}` } : { apikey: key };
};

async function fetchRemote(): Promise<ObsState | null> {
  const res = await fetch(`${supabaseRest.url}/rest/v1/${OBS_TABLE}?id=eq.main&select=data`, { headers: readHeaders(), cache: 'no-store' });
  if (!res.ok) throw new Error(res.status === 404 ? 'missing-table' : `HTTP ${res.status}`);
  const rows = (await res.json()) as { data: unknown }[];
  return rows[0] ? normalizeObsState(rows[0].data) : null;
}

export interface SubscribeHandlers {
  onState: (state: ObsState) => void;
  onReadStatus?: (status: ReadStatus, detail?: string) => void;
  /** false = polling only (public pages: no realtime connection per visitor). */
  realtime?: boolean;
  pollMs?: number;
}

/** Listens to every source. Returns the unsubscribe function. */
export function subscribeObs({ onState, onReadStatus, realtime: useRealtime = true, pollMs = 2_000 }: SubscribeHandlers): () => void {
  let lastTs = -1;
  let stopped = false;
  const deliver = (s: ObsState | null) => {
    if (!s || stopped || s.ts <= lastTs) return;
    lastTs = s.ts;
    onState(s);
  };

  deliver(readLocal());

  const ch = getChannel();
  const onMessage = (e: MessageEvent) => deliver(normalizeObsState(e.data));
  ch?.addEventListener('message', onMessage);
  const onStorage = (e: StorageEvent) => {
    if (e.key === LOCAL_KEY && e.newValue) {
      try {
        deliver(normalizeObsState(JSON.parse(e.newValue)));
      } catch {
        /* ignore malformed copies */
      }
    }
  };
  window.addEventListener('storage', onStorage);

  let cleanupRemote = () => {};
  if (obsRemoteEnabled) {
    onReadStatus?.('connecting');
    let realtime = false;
    let timer = 0;
    const poll = async () => {
      let failed = false;
      try {
        deliver(await fetchRemote());
        if (!realtime) onReadStatus?.('polling');
      } catch (e) {
        failed = true;
        const msg = e instanceof Error ? e.message : '';
        onReadStatus?.('error', msg === 'missing-table' ? 'missing-table' : 'network');
      }
      // Without the table (SQL not run yet) or offline, retry calmly instead of every 2 s.
      if (!stopped) timer = window.setTimeout(poll, failed ? 10_000 : realtime ? 15_000 : pollMs);
    };
    void poll();

    let removeChannel = () => {};
    if (useRealtime) void getSupabase()
      .then((sb) => {
        if (stopped) return;
        const rc = sb
          .channel('obs-state-main')
          .on('postgres_changes', { event: '*', schema: 'public', table: OBS_TABLE, filter: 'id=eq.main' }, (payload) => {
            const row = payload.new as { data?: unknown } | undefined;
            if (row?.data) deliver(normalizeObsState(row.data));
          })
          .subscribe((status) => {
            const wasRealtime = realtime;
            realtime = status === 'SUBSCRIBED';
            onReadStatus?.(realtime ? 'realtime' : 'polling');
            // Fell back to polling: poll right away instead of waiting for the slow timer.
            if (wasRealtime && !realtime && !stopped) {
              window.clearTimeout(timer);
              void poll();
            }
          });
        removeChannel = () => void sb.removeChannel(rc);
      })
      .catch(() => onReadStatus?.('polling'));

    cleanupRemote = () => {
      window.clearTimeout(timer);
      removeChannel();
    };
  } else {
    onReadStatus?.('local');
  }

  return () => {
    stopped = true;
    ch?.removeEventListener('message', onMessage);
    window.removeEventListener('storage', onStorage);
    cleanupRemote();
  };
}

// ───────────────────────── Publishing (admin) ─────────────────────────

let inflight = false;
let pending: ObsState | null = null;
let writeListener: (status: WriteStatus, error?: string) => void = () => {};

export const onWriteStatus = (cb: typeof writeListener) => {
  writeListener = cb;
};

function friendlyWriteError(message: string, code?: string) {
  const m = message.toLowerCase();
  if (code === '42P01' || code === 'PGRST205' || m.includes('does not exist') || m.includes('could not find the table')) {
    return 'Falta la taula «obs_state» a Supabase: executa l’SQL actualitzat (supabase/schema.sql).';
  }
  if (code === '42501' || m.includes('row-level security') || m.includes('permission')) return 'Sense permís: torna a iniciar sessió com a administrador.';
  if (m.includes('fetch') || m.includes('network')) return 'Sense connexió amb Supabase. Els canvis s’enviaran quan torni.';
  return message;
}

let retryTimer = 0;

async function flush() {
  if (inflight || !pending) return;
  window.clearTimeout(retryTimer);
  const state = pending;
  pending = null;
  inflight = true;
  writeListener('saving');
  let failed = false;
  try {
    const sb = await getSupabase();
    const { error } = await sb.from(OBS_TABLE).upsert({ id: 'main', data: state });
    if (error) {
      failed = true;
      writeListener('error', friendlyWriteError(error.message, error.code));
    } else writeListener('ok');
  } catch (e) {
    failed = true;
    writeListener('error', friendlyWriteError(e instanceof Error ? e.message : 'network'));
  } finally {
    inflight = false;
    if (failed) {
      // Keep the latest copy and retry calmly (a newer change retries at once).
      pending ??= state;
      retryTimer = window.setTimeout(() => void flush(), 4000);
    } else if (pending) void flush();
  }
}

/** Sends a new state to every overlay: same browser instantly, other devices through Supabase. */
export function publishObs(state: ObsState) {
  writeLocal(state);
  getChannel()?.postMessage(state);
  if (obsRemoteEnabled) {
    pending = state;
    void flush();
  }
}
