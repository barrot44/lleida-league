import type { ObsExecStatus } from '@/obs/types';
import { getSupabase, supabaseEnabled } from '@/lib/supabase';

/**
 * Back-channel from the overlay running inside OBS to the control panels: "I'm connected to OBS, these are the scenes,
 * the replay buffer is on…". The overlay cannot write the database (it is anonymous), so it uses a Realtime broadcast
 * channel (any device) plus a BroadcastChannel (same browser, for local tests).
 */

const LOCAL = 'lleida-league-obs-exec';
const REMOTE = 'obs-exec';
const EVENT = 'status';

type Listener = (s: ObsExecStatus) => void;

let local: BroadcastChannel | null | undefined;
const getLocal = () => {
  if (local === undefined) local = typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel(LOCAL);
  return local;
};

type RemoteChannel = { send: (msg: { type: 'broadcast'; event: string; payload: unknown }) => unknown };
let remote: Promise<RemoteChannel | null> | null = null;
const listeners = new Set<Listener>();

function getRemote(): Promise<RemoteChannel | null> {
  if (!supabaseEnabled) return Promise.resolve(null);
  remote ??= getSupabase()
    .then(
      (sb) =>
        new Promise<RemoteChannel | null>((resolve) => {
          const ch = sb.channel(REMOTE, { config: { broadcast: { self: false } } });
          ch.on('broadcast', { event: EVENT }, ({ payload }) => listeners.forEach((cb) => cb(payload as ObsExecStatus)));
          ch.subscribe((status) => {
            if (status === 'SUBSCRIBED') resolve(ch as unknown as RemoteChannel);
            else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') resolve(null);
          });
        }),
    )
    .catch(() => null);
  return remote;
}

export function sendExecStatus(status: ObsExecStatus) {
  getLocal()?.postMessage(status);
  void getRemote().then((ch) => ch?.send({ type: 'broadcast', event: EVENT, payload: status }));
}

export function onExecStatus(cb: Listener): () => void {
  listeners.add(cb);
  const ch = getLocal();
  const onMsg = (e: MessageEvent) => cb(e.data as ObsExecStatus);
  ch?.addEventListener('message', onMsg);
  void getRemote();
  return () => {
    listeners.delete(cb);
    ch?.removeEventListener('message', onMsg);
  };
}
