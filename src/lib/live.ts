import { useEffect } from 'react';
import { create } from 'zustand';
import type { ObsState } from '@/obs/types';

/**
 * What the public website knows about the live stream: the same state the OBS overlay shows (scoreboard, clock,
 * cards…), read by polling (no realtime connection per visitor — the free Supabase plan has few of those).
 */

interface LiveStore {
  state: ObsState | null;
}

export const useLiveStore = create<LiveStore>()(() => ({ state: null }));

let watchers = 0;
let stop: (() => void) | null = null;
let currentPoll = 0;

/** Shared subscription: every component that needs it uses the same poller. Faster on the live page. */
export function useLiveState(pollMs = 15_000): ObsState | null {
  const state = useLiveStore((s) => s.state);
  useEffect(() => {
    watchers++;
    const start = (ms: number) => {
      stop?.();
      currentPoll = ms;
      void import('@/obs/transport').then(({ subscribeObs }) => {
        if (currentPoll !== ms) return;
        stop = subscribeObs({ onState: (s) => useLiveStore.setState({ state: s }), realtime: false, pollMs: ms });
      });
    };
    if (watchers === 1 || pollMs < currentPoll) start(pollMs);
    return () => {
      watchers--;
      if (watchers === 0) {
        stop?.();
        stop = null;
        currentPoll = 0;
      }
    };
  }, [pollMs]);
  return state;
}

/** A broadcast counts as live while the scoreboard is on air and was touched in the last few hours. */
export function isLive(s: ObsState | null, now = Date.now()): s is ObsState {
  return !!s && s.scoreboard.visible && !!s.scoreboard.home && !!s.scoreboard.away && now - s.ts < 4 * 3600_000;
}

export interface StreamEmbed {
  provider: 'youtube' | 'twitch' | 'tiktok' | 'other';
  embedUrl: string | null;
  url: string;
}

/** Turns the link pasted in the panel into an embeddable player when the platform allows it. */
export function streamEmbed(raw: string): StreamEmbed | null {
  const url = raw.trim();
  if (!url) return null;
  const yt = /(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|live\/|shorts\/))([\w-]{11})/.exec(url);
  if (yt) return { provider: 'youtube', embedUrl: `https://www.youtube-nocookie.com/embed/${yt[1]}?autoplay=1&mute=1&rel=0`, url };
  const ytChannel = /youtube\.com\/channel\/(UC[\w-]{22})/.exec(url);
  if (ytChannel) return { provider: 'youtube', embedUrl: `https://www.youtube-nocookie.com/embed/live_stream?channel=${ytChannel[1]}&autoplay=1&mute=1`, url };
  const twitch = /twitch\.tv\/([\w]+)/.exec(url);
  if (twitch) return { provider: 'twitch', embedUrl: `https://player.twitch.tv/?channel=${twitch[1]}&parent=${window.location.hostname}&muted=true`, url };
  if (/tiktok\.com/.test(url)) return { provider: 'tiktok', embedUrl: null, url };
  if (/youtube\.com|youtu\.be/.test(url)) return { provider: 'youtube', embedUrl: null, url };
  return { provider: 'other', embedUrl: null, url };
}
