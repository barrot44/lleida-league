import { useEffect } from 'react';
import { pickData, useLeagueStore } from '@/store/useLeagueStore';
import { useUiStore } from '@/store/useUiStore';
import { forcePushRemote, pullRemote, pullRemoteVersion, pushRemote, remoteEnabled, type RemoteSnapshot } from '@/lib/remoteSync';
import { hasStoredSession, restoreAdminSession } from '@/lib/supabase';

const POLL_MS = 20_000;
const PUSH_DEBOUNCE_MS = 1_200;

/** Last remote version we have seen (`null` = the remote row does not exist yet). */
const meta = { updatedAt: null as string | null, applying: false, dirty: false };

const ui = () => useUiStore.getState();

function applySnapshot(snap: RemoteSnapshot) {
  meta.applying = true;
  try {
    useLeagueStore.getState().importData(snap.data);
  } finally {
    meta.applying = false;
  }
  meta.updatedAt = snap.updatedAt;
  meta.dirty = false;
}

/** Explicit admin action: replace the remote copy with what this browser has. */
export async function publishLocalToRemote(): Promise<boolean> {
  ui().setSyncStatus('syncing');
  const res = await forcePushRemote(pickData(useLeagueStore.getState()));
  if (res.status === 'ok') {
    meta.updatedAt = res.updatedAt;
    meta.dirty = false;
    ui().setSyncStatus('idle');
    return true;
  }
  ui().setSyncStatus('error');
  return false;
}

/** Explicit admin action: discard local data and download the remote copy. */
export async function downloadRemoteToLocal(): Promise<boolean> {
  try {
    const snap = await pullRemote();
    if (!snap) return false;
    applySnapshot(snap);
    ui().setSyncStatus('idle');
    return true;
  } catch {
    ui().setSyncStatus('error');
    return false;
  }
}

/**
 * With Supabase configured: everybody reads the shared league (initial load + polling every 20 s),
 * and — only while an admin is signed in — every change is pushed (debounced) with conflict detection.
 * Without Supabase this is a no-op and the app keeps using localStorage.
 */
export function useRemoteSync() {
  const adminUnlocked = useUiStore((s) => s.adminUnlocked);

  // Restore a previous admin session, load the shared data and keep it fresh.
  useEffect(() => {
    if (!remoteEnabled) return;
    let cancelled = false;

    // Restore a previous admin session. The app waits for it (and for the first read) before showing anything,
    // otherwise a signed-in admin would flash the maintenance screen on every reload.
    const restored = hasStoredSession()
      ? restoreAdminSession(() => ui().setAdminSession(null)).then((email) => {
          if (!cancelled && email !== null) ui().setAdminSession(email);
        })
      : Promise.resolve();

    const pull = async (initial: boolean) => {
      try {
        if (!initial) {
          if (meta.dirty) return; // never overwrite edits that are waiting to be pushed
          const version = await pullRemoteVersion();
          if (version === meta.updatedAt) return;
        }
        const snap = await pullRemote();
        if (cancelled) return;
        if (snap) applySnapshot(snap);
        else meta.updatedAt = null;
        ui().setSyncStatus('idle');
      } catch {
        if (!cancelled) ui().setSyncStatus('error');
      }
    };

    ui().setSyncStatus('syncing');
    void Promise.all([restored, pull(true)]).then(() => {
      if (!cancelled) ui().setRemoteReady(true);
    });
    const timer = window.setInterval(() => {
      if (!document.hidden) void pull(false);
    }, POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  // Push local edits while an admin is signed in.
  useEffect(() => {
    if (!remoteEnabled || !adminUnlocked) return;
    let timer: number | undefined;

    const push = async () => {
      ui().setSyncStatus('syncing');
      const res = await pushRemote(pickData(useLeagueStore.getState()), meta.updatedAt);
      if (res.status === 'ok') {
        meta.updatedAt = res.updatedAt;
        meta.dirty = false;
        ui().setSyncStatus('idle');
      } else if (res.status === 'conflict') {
        ui().setSyncStatus('conflict');
        ui().toast('Un altre administrador ha canviat les dades. S’ha carregat l’última versió; torna a fer el teu canvi.', 'error');
        meta.dirty = false;
        void downloadRemoteToLocal();
      } else {
        ui().setSyncStatus('error');
        ui().toast(`No s’ha pogut desar al núvol: ${res.message}`, 'error');
      }
    };

    const unsubscribe = useLeagueStore.subscribe((state, prev) => {
      if (meta.applying) return;
      if (
        state.teams === prev.teams &&
        state.players === prev.players &&
        state.matches === prev.matches &&
        state.gallery === prev.gallery &&
        state.news === prev.news &&
        state.champions === prev.champions &&
        state.sponsors === prev.sponsors &&
        state.referees === prev.referees &&
        state.videos === prev.videos &&
        state.lleidalitoTx === prev.lleidalitoTx &&
        state.settings === prev.settings
      )
        return;
      meta.dirty = true;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => void push(), PUSH_DEBOUNCE_MS);
    });

    return () => {
      window.clearTimeout(timer);
      unsubscribe();
    };
  }, [adminUnlocked]);
}
