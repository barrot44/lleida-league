import { useMemo } from 'react';
import { CalendarClock, Coins, Crown, Users } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { FormDots, PositionTag } from '@/components/ui/Badges';
import { PlayerAvatar } from '@/components/ui/PlayerAvatar';
import { TeamCrest } from '@/components/ui/TeamCrest';
import { CATEGORY_BY_ID } from '@/config/site';
import { useLeagueStore } from '@/store/useLeagueStore';
import { useUiStore } from '@/store/useUiStore';
import { useLeagueView } from '@/hooks/useLeagueView';
import { teamResults } from '@/lib/standings';
import { KIND_LABEL, balances, newestFirst, signed } from '@/lib/lleidalitos';
import { cn, formatDay, matchTimestamp } from '@/lib/utils';
import { squadOrder } from '@/obs/state';


export function TeamModal({ id, open, onClose }: { id: string; open: boolean; onClose: () => void }) {
  const team = useLeagueStore((s) => s.teams.find((t) => t.id === id));
  const allTeams = useLeagueStore((s) => s.teams);
  const txs = useLeagueStore((s) => s.lleidalitoTx);
  const view = useLeagueView(team?.category ?? 'senior');
  const openModal = useUiStore((s) => s.openModal);

  const data = useMemo(() => {
    if (!team) return null;
    const row = view.standings.find((r) => r.team.id === team.id);
    const roster = view.catPlayers
      .filter((p) => p.teamId === team.id)
      .sort(squadOrder);
    const results = teamResults(team.id, view.catMatches).reverse().slice(0, 5);
    const next = view.catMatches
      .filter((m) => m.status === 'scheduled' && (m.homeTeamId === team.id || m.awayTeamId === team.id))
      .sort((a, b) => matchTimestamp(a) - matchTimestamp(b))[0];
    return { row, roster, results, next };
  }, [team, view]);

  if (!team || !data) return null;
  const { row, roster, results, next } = data;
  const cat = CATEGORY_BY_ID[team.category];
  const balance = balances(allTeams, txs).get(team.id);
  const myTx = txs.filter((t) => t.teamId === team.id).sort(newestFirst).slice(0, 5);

  return (
    <Modal open={open} onOpenChange={(o) => !o && onClose()} title={`Equip ${team.name}`} hideHeader size="lg">
      <div
        className="relative overflow-hidden px-6 pb-8 pt-12 sm:px-8"
        style={{ background: `radial-gradient(80% 140% at 15% 0%, ${team.primaryColor}66, transparent 62%), linear-gradient(180deg, ${team.secondaryColor}88, transparent)` }}
      >
        <div className="flex flex-col items-center gap-6 text-center sm:flex-row sm:text-left">
          <div className="animate-float" style={{ filter: `drop-shadow(0 12px 30px ${team.primaryColor}aa)` }}>
            <TeamCrest team={team} size={132} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.25em]" style={{ color: cat.accent }}>
              {cat.label}
            </p>
            <h2 className="mt-1 text-4xl leading-none sm:text-5xl">{team.name}</h2>
            <p className="mt-3 inline-flex items-center gap-2 text-sm text-slate-300">
              <Crown size={15} className="text-amber-400" /> President: <strong className="text-white">{team.presidentName}</strong>
            </p>
            {team.lleidalitos !== undefined && (
              <p className="mt-2 inline-flex items-center gap-2 text-sm text-slate-300">
                <Coins size={15} className="text-amber-400" /> <strong className="text-white">{balance}</strong> Lleidalitos
              </p>
            )}
            {row && (
              <div className="mt-4 flex flex-wrap items-center justify-center gap-3 sm:justify-start">
                <span className="rounded-xl bg-black/40 px-3 py-1.5 font-display text-lg font-black uppercase text-amber-300">#{row.position} · {row.points} pts</span>
                <FormDots form={row.form} />
              </div>
            )}
          </div>
        </div>

        {row && (
          <dl className="mt-7 grid grid-cols-3 gap-2 sm:grid-cols-6">
            {[
              ['PJ', row.played],
              ['V', row.won],
              ['E', row.drawn],
              ['D', row.lost],
              ['GF', row.goalsFor],
              ['GC', row.goalsAgainst],
            ].map(([k, v]) => (
              <div key={k} className="rounded-xl border border-white/10 bg-black/30 py-2.5 text-center backdrop-blur">
                <dd className="digital text-2xl text-white">{v}</dd>
                <dt className="text-[10px] font-bold tracking-[0.2em] text-slate-400">{k}</dt>
              </div>
            ))}
          </dl>
        )}
      </div>

      <div className="space-y-8 p-6 sm:p-8">
        {team.history && (
          <section>
            <h3 className="section-title mb-3 !text-xl">Història</h3>
            <p className="leading-relaxed text-slate-300">{team.history}</p>
          </section>
        )}

        {myTx.length > 0 && (
          <section>
            <h3 className="section-title mb-4 !text-xl">Moviments de Lleidalitos</h3>
            <ul className="space-y-2">
              {myTx.map((tx) => (
                <li key={tx.id} className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.03] px-3 py-2 text-sm">
                  <span className="min-w-0 flex-1 truncate text-slate-200">
                    {tx.concept} <span className="text-xs text-slate-500">· {KIND_LABEL[tx.kind]}</span>
                  </span>
                  <span className={`digital text-lg ${tx.amount >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{signed(tx.amount)}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section>
          <h3 className="section-title mb-4 !text-xl">Plantilla</h3>
          {roster.length === 0 ? (
            <p className="text-sm text-slate-400">Aquest equip encara no té jugadors registrats.</p>
          ) : (
            <ul className="grid gap-2.5 sm:grid-cols-2">
              {roster.map((p) => (
                <li key={p.id}>
                  <button
                    onClick={() => openModal({ kind: 'player', id: p.id })}
                    className="group flex w-full items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.03] p-2.5 text-left transition hover:border-amber-400/50 hover:bg-white/[0.06]"
                  >
                    <PlayerAvatar player={p} team={team} size={46} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-white">{p.name}</p>
                      <p className="flex items-center gap-2 text-xs text-slate-400">
                        <span className="font-display font-black text-amber-300">#{p.dorsal}</span>
                        <PositionTag position={p.position} />
                      </p>
                    </div>
                    <div className="text-right text-xs text-slate-400">
                      <p>
                        <strong className="text-white">{p.stats.goals}</strong> G
                      </p>
                      <p>
                        <strong className="text-white">{p.stats.assists}</strong> A
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="grid gap-6 sm:grid-cols-2">
          <div>
            <h3 className="section-title mb-4 !text-xl">Últims resultats</h3>
            {results.length === 0 ? (
              <p className="text-sm text-slate-400">Encara no hi ha partits disputats.</p>
            ) : (
              <ul className="space-y-2">
                {results.map(({ match, gf, ga, result, isHome }) => {
                  const rivalId = isHome ? match.awayTeamId : match.homeTeamId;
                  const rival = view.teamMap.get(rivalId);
                  return (
                    <li key={match.id}>
                      <button
                        onClick={() => openModal({ kind: 'match', id: match.id })}
                        className="flex w-full items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.03] px-3 py-2 text-left text-sm transition hover:border-amber-400/40"
                      >
                        <span
                          className={cn(
                            'grid h-6 w-6 place-items-center rounded-md font-display text-xs font-black',
                            result === 'W' ? 'bg-emerald-500 text-emerald-950' : result === 'D' ? 'bg-slate-400 text-slate-900' : 'bg-red-500 text-white',
                          )}
                        >
                          {result === 'W' ? 'V' : result === 'D' ? 'E' : 'D'}
                        </span>
                        <span className="flex-1 truncate text-slate-300">
                          {isHome ? 'vs' : '@'} {rival?.name ?? '—'}
                        </span>
                        <span className="digital text-lg text-white">
                          {gf}-{ga}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          <div>
            <h3 className="section-title mb-4 !text-xl">Proper partit</h3>
            {next ? (
              <button
                onClick={() => openModal({ kind: 'match', id: next.id })}
                className="flex w-full items-center gap-4 rounded-xl border border-cyan-400/30 bg-cyan-400/[0.06] p-4 text-left transition hover:border-cyan-300"
              >
                <CalendarClock className="text-cyan-300" />
                <div className="text-sm">
                  <p className="font-bold text-white">
                    {view.teamMap.get(next.homeTeamId)?.shortName} vs {view.teamMap.get(next.awayTeamId)?.shortName}
                  </p>
                  <p className="text-slate-400">
                    {formatDay(next.date)} · {next.time} · {next.venue}
                  </p>
                </div>
              </button>
            ) : (
              <p className="flex items-center gap-2 text-sm text-slate-400">
                <Users size={16} /> No hi ha partits programats.
              </p>
            )}
          </div>
        </section>
      </div>
    </Modal>
  );
}
