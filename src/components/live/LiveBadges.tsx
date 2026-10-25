import { motion } from 'framer-motion';
import { ArrowRight, Radio } from 'lucide-react';
import { isLive, useLiveState } from '@/lib/live';
import { hrefFor } from '@/hooks/useHashRoute';
import { TeamCrest } from '@/components/ui/TeamCrest';
import { cn } from '@/lib/utils';

/** Red "EN DIRECTE" pill in the header while a match is being streamed. */
export function LiveHeaderBadge({ active }: { active: boolean }) {
  const s = useLiveState(20_000);
  if (!isLive(s)) return null;
  const sb = s.scoreboard;
  return (
    <a href={hrefFor('live')} className={cn('flex shrink-0 items-center gap-2 rounded-xl bg-red-600 px-3 py-2 font-display text-sm font-black uppercase tracking-wide text-white shadow-red transition hover:bg-red-500', active && 'ring-2 ring-white/50')}>
      <span className="h-2 w-2 animate-pulse-live rounded-full bg-white" />
      <span className="hidden sm:inline">Directe</span>
      <span className="digital">
        {sb.home?.shortName} {sb.homeScore}-{sb.awayScore} {sb.away?.shortName}
      </span>
    </a>
  );
}

/** Home page call-to-action while a match is live. */
export function LiveMatchBanner() {
  const s = useLiveState(20_000);
  if (!isLive(s)) return null;
  const sb = s.scoreboard;
  const { home, away } = sb;
  if (!home || !away) return null;
  return (
    <motion.a
      href={hrefFor('live')}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="group relative flex flex-wrap items-center gap-4 overflow-hidden rounded-3xl border border-red-500/60 p-4 shadow-red transition hover:border-red-400 sm:p-5"
      style={{ background: `linear-gradient(90deg, ${home.primaryColor}40, rgba(239,68,68,.12) 50%, ${away.primaryColor}40)` }}
    >
      <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-red-600 text-white shadow-red">
        <Radio size={28} />
      </span>
      <span className="min-w-0 flex-1 basis-48">
        <span className="flex items-center gap-2 whitespace-nowrap text-[11px] font-black uppercase tracking-[0.2em] text-red-200">
          <span className="h-2 w-2 animate-pulse-live rounded-full bg-red-500" /> Partit en directe
        </span>
        <span className="mt-1 flex items-center gap-3 font-display text-2xl font-black uppercase text-white">
          <TeamCrest team={home} size={30} /> {home.shortName}
          <span className="digital text-gold-gradient">
            {sb.homeScore}-{sb.awayScore}
          </span>
          {away.shortName} <TeamCrest team={away} size={30} />
        </span>
      </span>
      <span className="btn w-full shrink-0 bg-red-600 text-white hover:bg-red-500 sm:w-auto">
        Segueix-lo <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
      </span>
    </motion.a>
  );
}
