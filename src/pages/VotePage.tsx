import { CalendarDays, Vote } from 'lucide-react';
import { MvpVoteBox } from '@/components/vote/MvpVoteBox';
import { EmptyState, PageHeader } from '@/components/ui/Section';
import { StatusBadge } from '@/components/ui/Badges';
import { TeamCrest } from '@/components/ui/TeamCrest';
import { hrefFor } from '@/hooks/useHashRoute';
import { useLookups } from '@/hooks/useLeagueView';
import { isPrediction, useOpenPoll } from '@/lib/mvp';
import { useLeagueStore } from '@/store/useLeagueStore';

/** `/vota` — where the QR of the live stream sends people to choose the MVP. */
export default function VotePage() {
  const poll = useOpenPoll();
  const match = useLeagueStore((s) => (poll?.matchId ? s.matches.find((m) => m.id === poll.matchId) : undefined));
  const { teamMap } = useLookups();
  const home = match ? teamMap.get(match.homeTeamId) : undefined;
  const away = match ? teamMap.get(match.awayTeamId) : undefined;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <PageHeader eyebrow={isPrediction(poll) ? 'Porra en directe' : 'Votació del públic'} title={poll?.title ?? 'Vota l’MVP'} description={isPrediction(poll) ? 'Fes el teu pronòstic. Els resultats surten en directe a la retransmissió.' : 'Tria el millor jugador del partit. Els resultats surten en directe a la retransmissió.'} actions={<Vote aria-hidden className="hidden text-amber-400/40 sm:block" size={56} />} />

      {!poll ? (
        <EmptyState icon={<Vote />} title="Ara mateix no hi ha cap votació oberta" hint="Quan comenci una votació durant un directe, la trobaràs aquí i a la pàgina d’inici." />
      ) : (
        <div className="space-y-6">
          {match && home && away && (
            <div className="card flex items-center justify-center gap-4 px-4 py-4 sm:gap-8">
              <span className="flex min-w-0 flex-1 items-center justify-end gap-3">
                <span className="truncate text-right font-display text-lg font-black uppercase text-white sm:text-2xl">
                  <span className="sm:hidden">{home.shortName}</span>
                  <span className="hidden sm:inline">{home.name}</span>
                </span>
                <TeamCrest team={home} size={48} />
              </span>
              <span className="flex flex-col items-center gap-1">
                <span className="digital text-3xl text-gold-gradient sm:text-4xl">{match.status === 'scheduled' ? match.time : `${match.homeScore}-${match.awayScore}`}</span>
                <StatusBadge status={match.status} minute={match.liveMinute} />
              </span>
              <span className="flex min-w-0 flex-1 items-center gap-3">
                <TeamCrest team={away} size={48} />
                <span className="truncate font-display text-lg font-black uppercase text-white sm:text-2xl">
                  <span className="sm:hidden">{away.shortName}</span>
                  <span className="hidden sm:inline">{away.name}</span>
                </span>
              </span>
            </div>
          )}
          <div className="card p-4 sm:p-6">
            <MvpVoteBox poll={poll} />
          </div>
        </div>
      )}

      <div className="mt-8 text-center">
        <a href={hrefFor('calendar')} className="btn-ghost">
          <CalendarDays size={15} /> Resultats i calendari
        </a>
      </div>
    </div>
  );
}
