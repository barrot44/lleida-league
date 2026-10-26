import { useEffect, useRef } from 'react';
import type { ObsState } from '@/obs/types';
import { arenaCues } from '@/obs/sfx';

/** Plays each cue once, when it is fresh (scheduled cues such as the dice wait for their start time). */
export function useArenaSounds(state: ObsState) {
  const done = useRef(new Set<string>());
  useEffect(() => {
    const now = Date.now();
    const timers: number[] = [];
    for (const [id, at, play] of arenaCues(state)) {
      if (done.current.has(id)) continue;
      done.current.add(id);
      if (now - at > 5000 || at - now > 5000) continue;
      if (at > now) timers.push(window.setTimeout(play, at - now));
      else play();
    }
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [state]);
}
