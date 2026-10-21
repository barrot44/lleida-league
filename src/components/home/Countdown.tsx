import { AnimatePresence, motion } from 'framer-motion';
import { CalendarDays, MapPin } from 'lucide-react';
import type { Match, Team } from '@/types';
import { TeamCrest } from '@/components/ui/TeamCrest';
import { splitDuration, useNow } from '@/hooks/useNow';
import { useUiStore } from '@/store/useUiStore';
import { formatDay, matchTimestamp } from '@/lib/utils';

function Digit({ value, label }: { value: number; label: string }) {
  const text = String(value).padStart(2, '0');
  return (
    <div className="flex flex-col items-center">
      <div className="scoreboard relative grid h-16 w-16 place-items-center overflow-hidden rounded-xl border border-amber-400/25 shadow-glow sm:h-20 sm:w-20">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={text}
            initial={{ y: -22, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 22, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="digital text-gold-gradient text-4xl sm:text-5xl"
          >
            {text}
          </motion.span>
        </AnimatePresence>
        <div aria-hidden className="absolute inset-x-0 top-1/2 h-px bg-black/60" />
      </div>
      <span className="mt-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">{label}</span>
    </div>
  );
}

/** Live countdown to the next kick-off. */
export function Countdown({ match, home, away }: { match: Match; home: Team; away: Team }) {
  const now = useNow(1000);
  const openModal = useUiStore((s) => s.openModal);
  const { days, hours, minutes, seconds } = splitDuration(matchTimestamp(match) - now);

  return (
    <div className="glass-strong relative overflow-hidden rounded-3xl p-5 shadow-card sm:p-6">
      <div aria-hidden className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-amber-400/10 blur-3xl" />
      <p className="mb-4 text-xs font-black uppercase tracking-[0.25em] text-amber-400">Próximo gran partido</p>

      <button onClick={() => openModal({ kind: 'match', id: match.id })} className="group flex w-full items-center justify-between gap-3 text-left">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <TeamCrest team={home} size={54} className="transition-transform group-hover:scale-110" />
          <span className="truncate font-display text-xl font-black uppercase leading-none text-white sm:text-2xl">{home.shortName}</span>
        </div>
        <span className="font-display text-lg font-black italic text-slate-500">VS</span>
        <div className="flex min-w-0 flex-1 flex-row-reverse items-center gap-3">
          <TeamCrest team={away} size={54} className="transition-transform group-hover:scale-110" />
          <span className="truncate font-display text-xl font-black uppercase leading-none text-white sm:text-2xl">{away.shortName}</span>
        </div>
      </button>

      <div className="mt-5 flex justify-center gap-2.5 sm:gap-3">
        <Digit value={days} label="Días" />
        <Digit value={hours} label="Horas" />
        <Digit value={minutes} label="Min" />
        <Digit value={seconds} label="Seg" />
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-xs text-slate-400">
        <span className="inline-flex items-center gap-1.5">
          <CalendarDays size={13} className="text-amber-400" /> {formatDay(match.date)} · {match.time}h
        </span>
        <span className="inline-flex items-center gap-1.5">
          <MapPin size={13} className="text-amber-400" /> {match.venue}
        </span>
      </div>
    </div>
  );
}
