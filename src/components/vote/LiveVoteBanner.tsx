import { motion } from 'framer-motion';
import { ArrowRight, Vote } from 'lucide-react';
import { hrefFor } from '@/hooks/useHashRoute';
import { useLookups } from '@/hooks/useLeagueView';
import { isPrediction, myVote, useOpenPoll } from '@/lib/mvp';
import { useLeagueStore } from '@/store/useLeagueStore';
import { TeamCrest } from '@/components/ui/TeamCrest';

/** Home page call-to-action while a public MVP vote is open. */
export function LiveVoteBanner() {
  const poll = useOpenPoll();
  const match = useLeagueStore((s) => (poll?.matchId ? s.matches.find((m) => m.id === poll.matchId) : undefined));
  const { teamMap } = useLookups();
  if (!poll) return null;
  const home = match ? teamMap.get(match.homeTeamId) : undefined;
  const away = match ? teamMap.get(match.awayTeamId) : undefined;
  const voted = !!myVote(poll.id);

  return (
    <motion.a
      href={hrefFor('vote')}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="group relative flex flex-wrap items-center gap-4 overflow-hidden rounded-3xl border border-amber-400/50 bg-gradient-to-r from-amber-400/20 via-amber-400/[0.07] to-red-500/10 p-4 shadow-glow transition hover:border-amber-300 sm:p-5"
    >
      <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gold-gradient text-slate-950 shadow-glow">
        <Vote size={28} />
      </span>
      <span className="min-w-0 flex-1 basis-48">
        <span className="flex items-center gap-2 whitespace-nowrap text-[11px] font-black uppercase tracking-[0.2em] text-red-300">
          <span className="h-2 w-2 animate-pulse-live rounded-full bg-red-500" /> {isPrediction(poll) ? 'Porra en directe' : 'Votació en directe'}
        </span>
        <span className="block font-display text-2xl font-black uppercase leading-tight text-white">{voted ? (isPrediction(poll) ? 'Mira com va la porra' : 'Mira com va la votació') : poll.title}</span>
        {home && away && (
          <span className="mt-1 flex items-center gap-2 text-sm font-bold text-slate-300">
            <TeamCrest team={home} size={20} /> {home.shortName}
            <span className="digital text-amber-300">{match?.status === 'scheduled' ? 'vs' : `${match?.homeScore}-${match?.awayScore}`}</span>
            {away.shortName} <TeamCrest team={away} size={20} />
          </span>
        )}
      </span>
      <span className="btn-gold w-full shrink-0 sm:w-auto">
        {voted ? 'Resultats' : isPrediction(poll) ? 'Participa' : 'Vota ara'} <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
      </span>
    </motion.a>
  );
}
