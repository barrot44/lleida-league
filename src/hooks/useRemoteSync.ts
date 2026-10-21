import { useEffect, useState } from 'react';
import { useLeagueStore } from '@/store/useLeagueStore';
import { useUiStore } from '@/store/useUiStore';
import { pullRemote, pushRemote, remoteEnabled } from '@/lib/remoteSync';

export type SyncStatus = 'off' | 'idle' | 'syncing' | 'error';

/**
 * Pulls the remote copy on boot and — only while the admin panel is unlocked — pushes every change
 * (debounced). With no Supabase variables configured this is a no-op and everything stays in localStorage.
 */
export function useRemoteSync(): SyncStatus {
  const [status, setStatus] = useState<SyncStatus>(remoteEnabled ? 'idle' : 'off');
  const adminUnlocked = useUiStore((s) => s.adminUnlocked);

  useEffect(() => {
    if (!remoteEnabled) return;
    let cancelled = false;
    setStatus('syncing');
    pullRemote()
      .then((remote) => {
        if (!cancelled && remote) useLeagueStore.getState().importData(remote);
        if (!cancelled) setStatus('idle');
      })
      .catch(() => !cancelled && setStatus('error'));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!remoteEnabled || !adminUnlocked) return;
    let timer: number | undefined;
    const unsubscribe = useLeagueStore.subscribe((state, prev) => {
      if (state.teams === prev.teams && state.players === prev.players && state.matches === prev.matches && state.gallery === prev.gallery && state.news === prev.news) return;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        setStatus('syncing');
        const { teams, players, matches, gallery, news } = useLeagueStore.getState();
        pushRemote({ teams, players, matches, gallery, news })
          .then(() => setStatus('idle'))
          .catch(() => setStatus('error'));
      }, 1200);
    });
    return () => {
      window.clearTimeout(timer);
      unsubscribe();
    };
  }, [adminUnlocked]);

  return status;
}
