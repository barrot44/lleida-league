import { useMemo, useState } from 'react';
import { Scale } from 'lucide-react';
import type { CategoryId, Player, Team } from '@/types';
import { EmptyState } from '@/components/ui/Section';
import { FormDots } from '@/components/ui/Badges';
import { PlayerAvatar } from '@/components/ui/PlayerAvatar';
import { TeamCrest } from '@/components/ui/TeamCrest';
import { useLeagueView } from '@/hooks/useLeagueView';
import { playerRating, teamResults, type StandingRow } from '@/lib/standings';
import { cn, decimal, formatDateShort, matchTimestamp } from '@/lib/utils';
import { useUiStore } from '@/store/useUiStore';

interface Row {
  label: string;
  a: number;
  b: number;
  /** Lower is better (cards, goals against…). */
  low?: boolean;
  fmt?: (n: number) => string;
}

function StatRow({ row }: { row: Row }) {
  const max = Math.max(row.a, row.b, 1);
  const better = row.a === row.b ? 0 : (row.low ? row.a < row.b : row.a > row.b) ? -1 : 1;
  const fmt = row.fmt ?? ((n: number) => String(n));
  const bar = (v: number, side: 'l' | 'r', win: boolean) => (
    <span className={cn('flex h-2.5 flex-1 overflow-hidden rounded-full bg-white/10', side === 'l' && 'justify-end')}>
      <span className={cn('h-full rounded-full transition-all duration-700', win ? 'bg-gold-gradient shadow-glow' : 'bg-slate-500')} style={{ width: `${(v / max) * 100}%` }} />
    </span>
  );
  return (
    <li className="grid grid-cols-[3.2rem_1fr_3.2rem] items-center gap-3 py-2.5 sm:grid-cols-[4rem_1fr_4rem]">
      <span className={cn('digital text-right text-2xl', better === -1 ? 'text-amber-300' : 'text-slate-300')}>{fmt(row.a)}</span>
      <div>
        <p className="mb-1.5 text-center text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">{row.label}</p>
        <div className="flex gap-1.5">
          {bar(row.a, 'l', better === -1)}
          {bar(row.b, 'r', better === 1)}
        </div>
      </div>
      <span className={cn('digital text-2xl', better === 1 ? 'text-amber-300' : 'text-slate-300')}>{fmt(row.b)}</span>
    </li>
  );
}

const per = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 100) / 100 : 0);

function PlayerCompare({ players, teams }: { players: Player[]; teams: Map<string, Team> }) {
  const sorted = useMemo(() => [...players].sort((a, b) => b.stats.goals - a.stats.goals || a.name.localeCompare(b.name, 'es')), [players]);
  const [aId, setA] = useState(sorted[0]?.id ?? '');
  // Second player defaults to the best one from another team, so the first view is already an interesting duel.
  const [bId, setB] = useState(sorted.find((p) => p.teamId !== sorted[0]?.teamId)?.id ?? sorted[1]?.id ?? '');
  const a = sorted.find((p) => p.id === aId) ?? sorted[0];
  const b = sorted.find((p) => p.id === bId) ?? sorted[1] ?? sorted[0];
  if (!a || !b) return <EmptyState icon={<Scale />} title="Falten jugadors" hint="Cal almenys dos jugadors a la categoria per comparar-los." />;

  const select = (value: string, onChange: (v: string) => void, label: string) => (
    <select className="input" value={value} onChange={(e) => onChange(e.target.value)} aria-label={label}>
      {sorted.map((p) => (
        <option key={p.id} value={p.id}>
          {p.name} · {teams.get(p.teamId)?.shortName}
        </option>
      ))}
    </select>
  );
  const head = (p: Player) => (
    <div className="text-center">
      <div className="mx-auto w-fit">
        <PlayerAvatar player={p} team={teams.get(p.teamId)} size={84} className="ring-4 ring-amber-400/70" />
      </div>
      <p className="mt-2 font-display text-xl font-black uppercase leading-tight text-white">{p.name}</p>
      <p className="flex items-center justify-center gap-1.5 text-xs text-slate-400">
        {teams.get(p.teamId) && <TeamCrest team={teams.get(p.teamId) as Team} size={16} />} {teams.get(p.teamId)?.name}
      </p>
    </div>
  );
  const rows: Row[] = [
    { label: 'Valoració', a: playerRating(a), b: playerRating(b) },
    { label: 'Gols', a: a.stats.goals, b: b.stats.goals },
    { label: 'Assistències', a: a.stats.assists, b: b.stats.assists },
    { label: 'MVPs', a: a.stats.mvpAwards, b: b.stats.mvpAwards },
    { label: 'Partits', a: a.stats.matchesPlayed, b: b.stats.matchesPlayed },
    { label: 'Gols per partit', a: per(a.stats.goals, a.stats.matchesPlayed), b: per(b.stats.goals, b.stats.matchesPlayed), fmt: (n) => decimal(n, 2) },
    { label: 'Targetes grogues', a: a.stats.yellowCards, b: b.stats.yellowCards, low: true },
    { label: 'Targetes vermelles', a: a.stats.redCards, b: b.stats.redCards, low: true },
  ];

  return (
    <div className="card p-5 sm:p-7">
      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        {select(a.id, setA, 'Primer jugador')}
        {select(b.id, setB, 'Segon jugador')}
      </div>
      <div className="mb-4 grid grid-cols-[1fr_auto_1fr] items-start gap-3">
        {head(a)}
        <span className="mt-6 font-display text-2xl font-black italic text-slate-600">VS</span>
        {head(b)}
      </div>
      <ul className="divide-y divide-white/[0.06]">
        {rows.map((r) => (
          <StatRow key={r.label} row={r} />
        ))}
      </ul>
    </div>
  );
}

function TeamCompare({ standings, category, matches }: { standings: StandingRow[]; category: CategoryId; matches: ReturnType<typeof useLeagueView>['catMatches'] }) {
  const openModal = useUiStore((s) => s.openModal);
  const [aId, setA] = useState(standings[0]?.team.id ?? '');
  const [bId, setB] = useState(standings[1]?.team.id ?? '');
  const a = standings.find((r) => r.team.id === aId) ?? standings[0];
  const b = standings.find((r) => r.team.id === bId) ?? standings[1] ?? standings[0];
  if (!a || !b) return <EmptyState icon={<Scale />} title="Falten equips" hint="Cal almenys dos equips a la categoria per comparar-los." />;

  const h2h = matches
    .filter((m) => m.status === 'finished' && ((m.homeTeamId === a.team.id && m.awayTeamId === b.team.id) || (m.homeTeamId === b.team.id && m.awayTeamId === a.team.id)))
    .sort((x, y) => matchTimestamp(y) - matchTimestamp(x));
  const tally = h2h.reduce(
    (acc, m) => {
      const aHome = m.homeTeamId === a.team.id;
      const ga = (aHome ? m.homeScore : m.awayScore) as number;
      const gb = (aHome ? m.awayScore : m.homeScore) as number;
      acc.goalsA += ga;
      acc.goalsB += gb;
      if (ga > gb) acc.winsA++;
      else if (gb > ga) acc.winsB++;
      else acc.draws++;
      return acc;
    },
    { winsA: 0, winsB: 0, draws: 0, goalsA: 0, goalsB: 0 },
  );

  const select = (value: string, onChange: (v: string) => void, label: string) => (
    <select className="input" value={value} onChange={(e) => onChange(e.target.value)} aria-label={label}>
      {standings.map((r) => (
        <option key={r.team.id} value={r.team.id}>
          {r.team.name}
        </option>
      ))}
    </select>
  );
  const head = (r: StandingRow) => (
    <button onClick={() => openModal({ kind: 'team', id: r.team.id })} className="group text-center">
      <div className="mx-auto w-fit transition-transform group-hover:scale-110">
        <TeamCrest team={r.team} size={84} />
      </div>
      <p className="mt-2 font-display text-xl font-black uppercase leading-tight text-white">{r.team.name}</p>
      <div className="mt-1.5 flex justify-center">
        <FormDots form={r.form} size="sm" />
      </div>
    </button>
  );
  const rows: Row[] = [
    { label: 'Posició', a: a.position, b: b.position, low: true, fmt: (n) => `#${n}` },
    { label: 'Punts', a: a.points, b: b.points },
    { label: 'Partits jugats', a: a.played, b: b.played },
    { label: 'Victòries', a: a.won, b: b.won },
    { label: 'Empats', a: a.drawn, b: b.drawn },
    { label: 'Derrotes', a: a.lost, b: b.lost, low: true },
    { label: 'Gols a favor', a: a.goalsFor, b: b.goalsFor },
    { label: 'Gols en contra', a: a.goalsAgainst, b: b.goalsAgainst, low: true },
    { label: 'Gols a favor per partit', a: per(a.goalsFor, a.played), b: per(b.goalsFor, b.played), fmt: (n) => decimal(n, 2) },
  ];
  void category;

  return (
    <div className="space-y-6">
      <div className="card p-5 sm:p-7">
        <div className="mb-6 grid gap-4 sm:grid-cols-2">
          {select(a.team.id, setA, 'Primer equip')}
          {select(b.team.id, setB, 'Segon equip')}
        </div>
        <div className="mb-4 grid grid-cols-[1fr_auto_1fr] items-start gap-3">
          {head(a)}
          <span className="mt-6 font-display text-2xl font-black italic text-slate-600">VS</span>
          {head(b)}
        </div>
        <ul className="divide-y divide-white/[0.06]">
          {rows.map((r) => (
            <StatRow key={r.label} row={r} />
          ))}
        </ul>
      </div>

      <div className="card p-5 sm:p-7">
        <h3 className="mb-4 text-xl">Cara a cara</h3>
        {a.team.id === b.team.id ? (
          <p className="text-sm text-slate-400">Tria dos equips diferents.</p>
        ) : h2h.length === 0 ? (
          <p className="text-sm text-slate-400">Encara no s’han enfrontat aquesta temporada.</p>
        ) : (
          <>
            <div className="mb-5 grid grid-cols-3 gap-3 text-center">
              <div className="rounded-xl bg-white/[0.04] py-3">
                <p className="digital text-4xl text-amber-300">{tally.winsA}</p>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Victòries {a.team.shortName}</p>
              </div>
              <div className="rounded-xl bg-white/[0.04] py-3">
                <p className="digital text-4xl text-white">{tally.draws}</p>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Empats</p>
              </div>
              <div className="rounded-xl bg-white/[0.04] py-3">
                <p className="digital text-4xl text-amber-300">{tally.winsB}</p>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Victòries {b.team.shortName}</p>
              </div>
            </div>
            <ul className="space-y-2">
              {h2h.map((m) => {
                const results = teamResults(a.team.id, [m])[0];
                return (
                  <li key={m.id}>
                    <button onClick={() => openModal({ kind: 'match', id: m.id })} className="flex w-full items-center justify-between gap-3 rounded-xl border border-white/[0.07] bg-white/[0.03] px-4 py-2.5 text-left transition hover:border-amber-400/40">
                      <span className="text-sm text-slate-300">
                        J{m.matchday} · {formatDateShort(m.date)}
                      </span>
                      <span className="digital text-2xl text-white">
                        {m.homeScore} - {m.awayScore}
                      </span>
                      <span className={cn('text-xs font-black uppercase', results?.result === 'W' ? 'text-emerald-400' : results?.result === 'L' ? 'text-red-400' : 'text-slate-400')}>
                        {results?.result === 'W' ? `Guanya ${a.team.shortName}` : results?.result === 'L' ? `Guanya ${b.team.shortName}` : 'Empat'}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}

/** Side-by-side comparison of two players or two teams (with head-to-head for teams). */
export function CompareView({ category }: { category: CategoryId }) {
  const view = useLeagueView(category);
  const [mode, setMode] = useState<'players' | 'teams'>('players');
  return (
    <div>
      <div role="tablist" aria-label="Què vols comparar" className="glass mb-6 inline-flex gap-1 rounded-2xl p-1">
        {(
          [
            ['players', 'Jugadors'],
            ['teams', 'Equips'],
          ] as const
        ).map(([id, label]) => (
          <button key={id} role="tab" aria-selected={mode === id} onClick={() => setMode(id)} className={cn('rounded-xl px-5 py-2 font-display text-sm font-black uppercase tracking-wide transition', mode === id ? 'bg-gold-gradient text-slate-950 shadow-glow' : 'text-slate-400 hover:text-white')}>
            {label}
          </button>
        ))}
      </div>
      <div className="mx-auto max-w-3xl">
        {mode === 'players' ? <PlayerCompare players={view.catPlayers} teams={view.teamMap} /> : <TeamCompare standings={view.standings} category={category} matches={view.catMatches} />}
      </div>
    </div>
  );
}
