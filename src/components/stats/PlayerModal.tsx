import { useMemo } from 'react';
import { ArrowRight } from 'lucide-react';
import { POSITION_LABEL } from '@/config/site';
import { Modal } from '@/components/ui/Modal';
import { PlayerCard } from '@/components/ui/PlayerCard';
import { TeamCrest } from '@/components/ui/TeamCrest';
import { useLeagueStore } from '@/store/useLeagueStore';
import { useUiStore } from '@/store/useUiStore';
import { useLeagueView } from '@/hooks/useLeagueView';
import { decimal, formatDay } from '@/lib/utils';

export function PlayerModal({ id, open, onClose }: { id: string; open: boolean; onClose: () => void }) {
  const player = useLeagueStore((s) => s.players.find((p) => p.id === id));
  const teamCategory = useLeagueStore((s) => s.teams.find((t) => t.id === player?.teamId)?.category);
  const view = useLeagueView(teamCategory ?? 'senior');
  const openModal = useUiStore((s) => s.openModal);

  const info = useMemo(() => {
    if (!player) return null;
    const ranking = [...view.catPlayers].sort((a, b) => b.stats.goals - a.stats.goals || b.stats.assists - a.stats.assists || b.stats.mvpAwards - a.stats.mvpAwards || a.name.localeCompare(b.name, 'es'));
    const rank = ranking.findIndex((p) => p.id === player.id) + 1;
    const appearances = view.catMatches
      .filter((m) => m.status === 'finished' && (m.mvpPlayerId === player.id || m.events.some((e) => e.playerId === player.id || e.assistPlayerId === player.id)))
      .reverse()
      .slice(0, 5)
      .map((m) => {
        const goals = m.events.filter((e) => e.type === 'goal' && e.playerId === player.id).length;
        const assists = m.events.filter((e) => e.assistPlayerId === player.id).length;
        const cards = m.events.filter((e) => (e.type === 'yellow_card' || e.type === 'red_card') && e.playerId === player.id).length;
        return { match: m, goals, assists, cards, mvp: m.mvpPlayerId === player.id };
      });
    return { rank, appearances };
  }, [player, view]);

  if (!player || !info) return null;
  const team = view.teamMap.get(player.teamId);
  const s = player.stats;
  const perGame = s.matchesPlayed > 0 ? decimal(s.goals / s.matchesPlayed, 2) : '0,00';

  return (
    <Modal open={open} onOpenChange={(o) => !o && onClose()} title={`Fitxa de ${player.name}`} hideHeader size="lg">
      <div className="grid gap-8 p-6 pt-12 sm:p-8 sm:pt-10 md:grid-cols-[auto_1fr]">
        <div className="mx-auto">
          <PlayerCard player={player} team={team} size={270} />
        </div>

        <div className="min-w-0 space-y-6">
          <div>
            {team && (
              <button onClick={() => openModal({ kind: 'team', id: team.id })} className="group inline-flex items-center gap-2 text-sm font-bold text-slate-300 transition hover:text-amber-300">
                <TeamCrest team={team} size={26} /> {team.name} <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
              </button>
            )}
            <h2 className="mt-2 text-4xl leading-none sm:text-5xl">{player.name}</h2>
            <p className="mt-2 text-sm uppercase tracking-widest text-slate-400">
              {POSITION_LABEL[player.position]} · Dorsal {player.dorsal}
              {player.nickname ? ` · “${player.nickname}”` : ''}
            </p>
          </div>

          <dl className="grid grid-cols-3 gap-2">
            {[
              ['Gols', s.goals],
              ['Assistències', s.assists],
              ['MVPs', s.mvpAwards],
              ['Partits', s.matchesPlayed],
              ['Grogues', s.yellowCards],
              ['Vermelles', s.redCards],
            ].map(([k, v]) => (
              <div key={k} className="rounded-xl border border-white/10 bg-white/[0.04] py-3 text-center">
                <dd className="digital text-3xl text-white">{v}</dd>
                <dt className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">{k}</dt>
              </div>
            ))}
          </dl>

          <p className="text-sm text-slate-400">
            Mitjana de <strong className="text-amber-300">{perGame}</strong> gols per partit · Lloc <strong className="text-amber-300">#{info.rank}</strong> a la llista de golejadors.
          </p>

          <div>
            <h3 className="mb-3 text-lg">Darreres actuacions</h3>
            {info.appearances.length === 0 ? (
              <p className="text-sm text-slate-400">Encara no hi ha accions registrades.</p>
            ) : (
              <ul className="space-y-2">
                {info.appearances.map(({ match, goals, assists, cards, mvp }) => (
                  <li key={match.id}>
                    <button
                      onClick={() => openModal({ kind: 'match', id: match.id })}
                      className="flex w-full items-center justify-between gap-3 rounded-xl border border-white/[0.07] bg-white/[0.03] px-3 py-2 text-left text-sm transition hover:border-amber-400/40"
                    >
                      <span className="truncate text-slate-300">
                        J{match.matchday} · {view.teamMap.get(match.homeTeamId)?.shortName} {match.homeScore}-{match.awayScore} {view.teamMap.get(match.awayTeamId)?.shortName}
                      </span>
                      <span className="flex shrink-0 items-center gap-2 text-xs text-slate-400">
                        {goals > 0 && <span className="text-white">⚽ {goals}</span>}
                        {assists > 0 && <span className="text-cyan-300">A {assists}</span>}
                        {cards > 0 && <span className="text-yellow-300">🟨</span>}
                        {mvp && <span className="font-black text-amber-300">MVP</span>}
                        <span className="hidden sm:inline">{formatDay(match.date)}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
