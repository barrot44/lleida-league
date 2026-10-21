import { useMemo } from 'react';
import type { Match } from '@/types';
import { useLeagueStore } from '@/store/useLeagueStore';
import { useUiStore } from '@/store/useUiStore';
import { useLookups } from '@/hooks/useLeagueView';
import { CATEGORY_BY_ID } from '@/config/site';
import { TeamCrest } from '@/components/ui/TeamCrest';
import { matchTimestamp, relativeDay } from '@/lib/utils';

/** Marquee with the live match, the latest results and the upcoming fixtures of every category. */
export function Ticker() {
  const matches = useLeagueStore((s) => s.matches);
  const { teamMap } = useLookups();
  const openModal = useUiStore((s) => s.openModal);

  const items = useMemo(() => {
    const live = matches.filter((m) => m.status === 'live');
    const finished = matches
      .filter((m) => m.status === 'finished')
      .sort((a, b) => matchTimestamp(b) - matchTimestamp(a))
      .slice(0, 8);
    const next = matches
      .filter((m) => m.status === 'scheduled')
      .sort((a, b) => matchTimestamp(a) - matchTimestamp(b))
      .slice(0, 5);
    return [...live, ...next, ...finished];
  }, [matches]);

  if (items.length === 0) return null;

  const render = (m: Match, key: string) => {
    const home = teamMap.get(m.homeTeamId);
    const away = teamMap.get(m.awayTeamId);
    if (!home || !away) return null;
    return (
      <button
        key={key}
        onClick={() => openModal({ kind: 'match', id: m.id })}
        className="group flex shrink-0 items-center gap-2.5 px-5 text-xs transition hover:text-white"
      >
        {m.status === 'live' ? (
          <span className="flex items-center gap-1.5 font-black uppercase tracking-widest text-red-400">
            <span className="h-2 w-2 animate-pulse-live rounded-full bg-red-500" /> Directo
          </span>
        ) : m.status === 'finished' ? (
          <span className="font-black uppercase tracking-widest text-emerald-400/90">Final</span>
        ) : (
          <span className="font-black uppercase tracking-widest text-cyan-400/90">{relativeDay(m.date)}</span>
        )}
        <span className="rounded bg-white/[0.07] px-1.5 py-0.5 font-bold uppercase tracking-wider text-slate-400">{CATEGORY_BY_ID[m.category].short}</span>
        <TeamCrest team={home} size={16} />
        <span className="font-display text-sm font-black uppercase text-white">{home.shortName}</span>
        {m.status === 'scheduled' ? (
          <span className="font-display text-sm font-black text-amber-400">{m.time}</span>
        ) : (
          <span className="digital rounded bg-black/50 px-2 py-0.5 text-sm text-amber-300">
            {m.homeScore} - {m.awayScore}
          </span>
        )}
        <span className="font-display text-sm font-black uppercase text-white">{away.shortName}</span>
        <TeamCrest team={away} size={16} />
        <span className="ml-3 text-slate-700">◆</span>
      </button>
    );
  };

  return (
    <div className="relative h-9 overflow-hidden border-b border-white/[0.07] bg-black/60 text-slate-300" aria-label="Últimos resultados y próximos partidos">
      <div className="absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-pitch to-transparent" />
      <div className="absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-pitch to-transparent" />
      <div className="flex h-full w-max animate-marquee items-center hover:[animation-play-state:paused]">
        {items.map((m) => render(m, m.id))}
        {items.map((m) => render(m, `${m.id}-dup`))}
      </div>
    </div>
  );
}
