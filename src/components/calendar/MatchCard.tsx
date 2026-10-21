import { motion } from 'framer-motion';
import { Clock, MapPin, Star } from 'lucide-react';
import type { Match, Team } from '@/types';
import { StatusBadge } from '@/components/ui/Badges';
import { TeamCrest } from '@/components/ui/TeamCrest';
import { CATEGORY_BY_ID } from '@/config/site';
import { useUiStore } from '@/store/useUiStore';
import { cn, formatDay, relativeDay } from '@/lib/utils';

interface Props {
  match: Match;
  home: Team;
  away: Team;
  index?: number;
}

function TeamSide({ team, align, dim, win }: { team: Team; align: 'left' | 'right'; dim: boolean; win: boolean }) {
  const openModal = useUiStore((s) => s.openModal);
  return (
    <button
      onClick={() => openModal({ kind: 'team', id: team.id })}
      className={cn('group flex min-w-0 flex-col items-center gap-2 text-center sm:flex-row sm:gap-3 sm:text-left', align === 'right' && 'sm:flex-row-reverse sm:text-right')}
      aria-label={`Ver equipo ${team.name}`}
    >
      <span className="transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3">
        <TeamCrest team={team} size={52} />
      </span>
      <span className="min-w-0">
        <span className={cn('block truncate font-display text-lg font-black uppercase leading-tight sm:text-xl', dim ? 'text-slate-400' : 'text-white', win && 'text-amber-300')}>
          {team.shortName}
        </span>
        <span className="hidden truncate text-xs text-slate-500 sm:block">{team.name}</span>
      </span>
    </button>
  );
}

export function MatchCard({ match, home, away, index = 0 }: Props) {
  const openModal = useUiStore((s) => s.openModal);
  const live = match.status === 'live';
  const finished = match.status === 'finished';
  const started = live || finished;
  const hs = match.homeScore ?? 0;
  const as = match.awayScore ?? 0;
  const homeWin = finished && hs > as;
  const awayWin = finished && as > hs;
  const cat = CATEGORY_BY_ID[match.category];

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: Math.min(index, 8) * 0.04 }}
      className={cn('card-hover overflow-hidden', live && 'border-red-500/40 shadow-red hover:border-red-400/60 hover:shadow-red')}
    >
      <div className="flex items-center justify-between gap-2 border-b border-white/[0.06] px-4 py-2.5">
        <p className="truncate text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
          <span style={{ color: cat.accent }}>{cat.short}</span> · Jornada {match.matchday}
        </p>
        <StatusBadge status={match.status} minute={match.liveMinute} />
      </div>

      <div className="scoreboard grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-3 py-5 sm:gap-4 sm:px-5">
        <TeamSide team={home} align="right" dim={finished && !homeWin && hs !== as} win={homeWin} />

        <div className="min-w-[96px] text-center">
          {started ? (
            <div
              className={cn(
                'digital inline-flex items-center gap-2 rounded-xl border px-3 py-1 text-4xl sm:text-5xl',
                live ? 'animate-pulse-ring border-red-500/50 bg-red-500/10 text-red-100' : 'border-amber-400/20 bg-black/40 text-gold-gradient',
              )}
            >
              <span>{hs}</span>
              <span className="text-slate-500">:</span>
              <span>{as}</span>
            </div>
          ) : (
            <div>
              <p className="digital text-4xl text-gold-gradient sm:text-5xl">{match.time}</p>
              <p className="mt-0.5 text-xs font-bold uppercase tracking-widest text-cyan-300">{relativeDay(match.date)}</p>
            </div>
          )}
        </div>

        <TeamSide team={away} align="left" dim={finished && !awayWin && hs !== as} win={awayWin} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-white/[0.06] px-4 py-3">
        <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
          <span className="inline-flex items-center gap-1.5">
            <Clock size={13} /> {formatDay(match.date)} · {match.time}
          </span>
          <span className="inline-flex min-w-0 items-center gap-1.5">
            <MapPin size={13} className="shrink-0" /> <span className="truncate">{match.venue}</span>
          </span>
          {finished && match.mvpPlayerId && (
            <span className="inline-flex items-center gap-1 text-amber-300">
              <Star size={13} fill="currentColor" /> MVP
            </span>
          )}
        </div>
        <button onClick={() => openModal({ kind: 'match', id: match.id })} className="btn-ghost !px-3 !py-1.5 text-xs">
          Ficha del partido
        </button>
      </div>
    </motion.article>
  );
}
