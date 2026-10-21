import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Search, UserX } from 'lucide-react';
import type { Player, Position } from '@/types';
import { Podium } from '@/components/stats/Podium';
import { EmptyState, PageHeader } from '@/components/ui/Section';
import { PlayerAvatar } from '@/components/ui/PlayerAvatar';
import { PositionTag } from '@/components/ui/Badges';
import { TeamCrest } from '@/components/ui/TeamCrest';
import { CATEGORY_BY_ID, POSITIONS, POSITION_LABEL } from '@/config/site';
import { useUiStore } from '@/store/useUiStore';
import { useLeagueView } from '@/hooks/useLeagueView';
import { cn } from '@/lib/utils';

type Metric = 'goals' | 'mvpAwards' | 'assists';

const METRICS: { id: Metric; label: string; unit: string }[] = [
  { id: 'goals', label: 'Golejadors', unit: 'gols' },
  { id: 'mvpAwards', label: 'MVPs', unit: 'MVPs' },
  { id: 'assists', label: 'Assistents', unit: 'assist.' },
];

const PAGE = 15;

export default function StatsPage() {
  const category = useUiStore((s) => s.category);
  const openModal = useUiStore((s) => s.openModal);
  const view = useLeagueView(category);
  const cat = CATEGORY_BY_ID[category];

  const [metric, setMetric] = useState<Metric>('goals');
  const [query, setQuery] = useState('');
  const [position, setPosition] = useState<Position | 'all'>('all');
  const [limit, setLimit] = useState(PAGE);

  const ranked = useMemo(() => {
    const secondary: Metric[] = ['goals', 'assists', 'mvpAwards'].filter((m) => m !== metric) as Metric[];
    return [...view.catPlayers].sort(
      (a, b) =>
        b.stats[metric] - a.stats[metric] ||
        b.stats[secondary[0]] - a.stats[secondary[0]] ||
        b.stats[secondary[1]] - a.stats[secondary[1]] ||
        a.name.localeCompare(b.name, 'es'),
    );
  }, [view.catPlayers, metric]);

  const podium = ranked
    .filter((p) => p.stats[metric] > 0)
    .slice(0, 3)
    .map((p) => ({ player: p, team: view.teamMap.get(p.teamId), value: p.stats[metric] }));

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ranked
      .map((p, i) => ({ p, rank: i + 1 }))
      .filter(({ p }) => position === 'all' || p.position === position)
      .filter(({ p }) => {
        if (!q) return true;
        const team = view.teamMap.get(p.teamId);
        return [p.name, p.nickname, team?.name, team?.shortName].some((s) => s?.toLowerCase().includes(q));
      });
  }, [ranked, query, position, view.teamMap]);

  const current = METRICS.find((m) => m.id === metric)!;
  const th = 'px-2 py-3 text-center font-bold';
  const highlight = (m: Metric) => (m === metric ? 'text-amber-300' : 'text-slate-300');

  const cell = (p: Player, key: Metric) => (
    <td className={cn('px-2 text-center font-display text-lg font-black', highlight(key))}>{p.stats[key]}</td>
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <PageHeader eyebrow={cat.label} title="Golejadors i MVPs" description="Pitxitxi, assistents i premis MVP. Tot s’actualitza sol amb els partits finalitzats." />

      <div role="tablist" aria-label="Estadística" className="glass mb-8 inline-flex gap-1 rounded-2xl p-1">
        {METRICS.map((m) => {
          const active = m.id === metric;
          return (
            <button
              key={m.id}
              role="tab"
              aria-selected={active}
              onClick={() => {
                setMetric(m.id);
                setLimit(PAGE);
              }}
              className={cn('relative rounded-xl px-4 py-2 font-display text-sm font-black uppercase tracking-wide transition-colors sm:px-6', active ? 'text-slate-950' : 'text-slate-400 hover:text-white')}
            >
              {active && <motion.span layoutId="stats-tab" className="absolute inset-0 rounded-xl bg-gold-gradient shadow-glow" transition={{ type: 'spring', damping: 28, stiffness: 380 }} />}
              <span className="relative">{m.label}</span>
            </button>
          );
        })}
      </div>

      {podium.length > 0 ? (
        <div key={metric} className="mb-12">
          <Podium entries={podium} unit={current.unit} />
        </div>
      ) : (
        <EmptyState className="mb-12" icon={<UserX />} title="Encara sense dades" hint="Quan es finalitzin partits, aquí apareixeran els líders de la categoria." />
      )}

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setLimit(PAGE);
            }}
            placeholder="Cerca jugador o equip…"
            aria-label="Cerca jugador o equip"
            className="input !pl-10"
          />
        </div>
        <select value={position} onChange={(e) => setPosition(e.target.value as Position | 'all')} aria-label="Filtra per posició" className="input !w-auto">
          <option value="all">Totes les posicions</option>
          {POSITIONS.map((p) => (
            <option key={p} value={p}>
              {POSITION_LABEL[p]}
            </option>
          ))}
        </select>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-black/30 text-[11px] uppercase tracking-[0.14em] text-slate-400">
                <th className={cn(th, 'w-12 pl-4')}>#</th>
                <th className={cn(th, 'text-left')}>Jugador</th>
                <th className={cn(th, 'hidden sm:table-cell')}>Pos</th>
                <th className={cn(th, 'hidden md:table-cell')}>PJ</th>
                <th className={cn(th, highlight('goals'))}>Gols</th>
                <th className={cn(th, highlight('assists'))}>Assist</th>
                <th className={cn(th, highlight('mvpAwards'))}>MVP</th>
                <th className={cn(th, 'hidden pr-4 md:table-cell')}>🟨 / 🟥</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, limit).map(({ p, rank }) => {
                const team = view.teamMap.get(p.teamId);
                return (
                  <tr
                    key={p.id}
                    tabIndex={0}
                    onClick={() => openModal({ kind: 'player', id: p.id })}
                    onKeyDown={(e) => e.key === 'Enter' && openModal({ kind: 'player', id: p.id })}
                    className="cursor-pointer border-b border-white/[0.05] transition-colors last:border-0 hover:bg-white/[0.05]"
                  >
                    <td className="py-2.5 pl-4 text-center font-display text-base font-black text-slate-400">
                      {rank <= 3 ? ['🥇', '🥈', '🥉'][rank - 1] : rank}
                    </td>
                    <td className="py-2.5 pr-2">
                      <div className="flex items-center gap-3">
                        <PlayerAvatar player={p} team={team} size={40} />
                        <div className="min-w-0">
                          <p className="truncate font-bold text-white">{p.name}</p>
                          <p className="flex items-center gap-1.5 text-xs text-slate-400">
                            {team && <TeamCrest team={team} size={14} />} {team?.name}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="hidden px-2 text-center sm:table-cell">
                      <PositionTag position={p.position} />
                    </td>
                    <td className="hidden px-2 text-center text-slate-300 md:table-cell">{p.stats.matchesPlayed}</td>
                    {cell(p, 'goals')}
                    {cell(p, 'assists')}
                    {cell(p, 'mvpAwards')}
                    <td className="hidden px-2 pr-4 text-center text-slate-300 md:table-cell">
                      {p.stats.yellowCards} / {p.stats.redCards}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {rows.length === 0 && <p className="px-6 py-10 text-center text-slate-400">Cap jugador coincideix amb la cerca.</p>}
        {rows.length > limit && (
          <div className="border-t border-white/10 p-3 text-center">
            <button className="btn-ghost" onClick={() => setLimit((l) => l + PAGE)}>
              Mostra’n més ({rows.length - limit})
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
