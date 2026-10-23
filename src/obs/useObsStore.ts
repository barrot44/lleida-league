import { useEffect } from 'react';
import { create } from 'zustand';
import type { ObsState } from '@/obs/types';
import { defaultObsState } from '@/obs/state';
import { onWriteStatus, publishObs, subscribeObs, type ReadStatus, type WriteStatus } from '@/obs/transport';

interface ObsStore {
  state: ObsState;
  readStatus: ReadStatus;
  readDetail?: string;
  writeStatus: WriteStatus;
  writeError: string | null;
  /** Applies a change and publishes it to every overlay. */
  update: (fn: (s: ObsState) => ObsState) => void;
}

export const useObsStore = create<ObsStore>()((set, get) => ({
  state: defaultObsState(),
  readStatus: 'connecting',
  writeStatus: 'idle',
  writeError: null,
  update: (fn) => {
    const prev = get().state;
    // Strictly increasing even across devices whose clocks differ a little: newer edits always win.
    const next = { ...fn(prev), ts: Math.max(Date.now(), prev.ts + 1) };
    set({ state: next });
    publishObs(next);
  },
}));

onWriteStatus((writeStatus, error) => useObsStore.setState({ writeStatus, writeError: writeStatus === 'error' ? (error ?? 'Error') : null }));

/** Keeps the panel in sync with what the overlay shows (also when another device — e.g. a phone — changes it). */
export function useObsSync() {
  useEffect(
    () =>
      subscribeObs({
        onState: (incoming) => {
          if (incoming.ts > useObsStore.getState().state.ts) useObsStore.setState({ state: incoming });
        },
        onReadStatus: (readStatus, readDetail) => useObsStore.setState({ readStatus, readDetail }),
      }),
    [],
  );
}
