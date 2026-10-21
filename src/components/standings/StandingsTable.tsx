import { motion } from 'framer-motion';
import { AlertTriangle, Crown } from 'lucide-react';
import type { CategoryMeta } from '@/types';
import type { StandingRow } from '@/lib/standings';
import { FormDots } from '@/components/ui/Badges';
import { TeamCrest } from '@/components/ui/TeamCrest';
import { useUiStore } from '@/store/useUiStore';
import { cn } from '@/lib/utils';

type Zone = 'champion' | 'playoff' | 'danger' | 'none';

export function zoneOf(position: number, total: number, cat: CategoryMeta): Zone {
  if (position === 1) return 'champion';
  if (position <= cat.playoffSpots) return 'playoff';
  if (total > cat.playoffSpots + cat.relegationSpots && position > total - cat.relegationSpots) return 'danger';
  return 'none';
}

const ROW: Record<Zone, string> = {
  champion: 'bg-amber-400/[0.07] hover:bg-amber-400/[0.13] shadow-[inset_3px_0_0_#FBBF24]',
  playoff: 'bg-emerald-500/[0.05] hover:bg-emerald-500/[0.1] shadow-[inset_3px_0_0_#10B981]',
  danger: 'bg-red-500/[0.06] hover:bg-red-500/[0.12] shadow-[inset_3px_0_0_#EF4444]',
  none: 'hover:bg-white/[0.05] shadow-[inset_3px_0_0_transparent]',
};

const POS_BADGE: Record<Zone, string> = {
  champion: 'bg-gold-gradient text-slate-950 shadow-glow',
  playoff: 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-400/40',
  danger: 'bg-red-500/20 text-red-300 ring-1 ring-red-400/40',
  none: 'bg-white/[0.06] text-slate-300',
};

interface Props {
  rows: StandingRow[];
  category: CategoryMeta;
  compact?: boolean;
  limit?: number;
}

export function StandingsTable({ rows, category, compact, limit }: Props) {
  const openModal = useUiStore((s) => s.openModal);
  const visible = limit ? rows.slice(0, limit) : rows;
  const th = 'px-2 py-3 text-center font-bold';
  const hideCompact = compact ? 'hidden' : 'hidden sm:table-cell';

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[320px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-black/30 text-[11px] uppercase tracking-[0.14em] text-slate-400">
              <th className={cn(th, 'w-12 pl-4')}>#</th>
              <th className={cn(th, 'text-left')}>Equipo</th>
              <th className={th} title="Partidos jugados">PJ</th>
              <th className={cn(th, hideCompact)} title="Ganados">PG</th>
              <th className={cn(th, hideCompact)} title="Empatados">PE</th>
              <th className={cn(th, hideCompact)} title="Perdidos">PP</th>
              <th className={cn(th, hideCompact)} title="Goles a favor">GF</th>
              <th className={cn(th, hideCompact)} title="Goles en contra">GC</th>
              <th className={th} title="Diferencia de goles">DG</th>
              <th className={cn(th, 'pr-4 text-amber-300')}>PTS</th>
              {!compact && <th className={cn(th, 'hidden md:table-cell')}>Racha</th>}
            </tr>
          </thead>
          <tbody>
            {visible.map((r) => {
              const zone = zoneOf(r.position, rows.length, category);
              return (
                <motion.tr
                  key={r.team.id}
                  layout="position"
                  transition={{ type: 'spring', damping: 30, stiffness: 320 }}
                  tabIndex={0}
                  onClick={() => openModal({ kind: 'team', id: r.team.id })}
                  onKeyDown={(e) => e.key === 'Enter' && openModal({ kind: 'team', id: r.team.id })}
                  className={cn('cursor-pointer border-b border-white/[0.05] transition-colors last:border-0', ROW[zone])}
                >
                  <td className="py-3 pl-4 text-center">
                    <span className={cn('inline-grid h-8 w-8 place-items-center rounded-lg font-display text-base font-black', POS_BADGE[zone])}>
                      {zone === 'champion' ? <Crown size={16} /> : r.position}
                    </span>
                  </td>
                  <td className="py-2.5 pr-2">
                    <div className="flex items-center gap-3">
                      <TeamCrest team={r.team} size={compact ? 30 : 36} />
                      <div className="min-w-0">
                        <p className="truncate font-display text-base font-black uppercase leading-tight text-white sm:text-lg">{compact ? r.team.shortName : r.team.name}</p>
                        {!compact && <p className="hidden truncate text-[11px] text-slate-500 sm:block">Pres. {r.team.presidentName}</p>}
                      </div>
                      {zone === 'danger' && <AlertTriangle size={14} className="shrink-0 text-red-400" aria-label="Zona de peligro" />}
                    </div>
                  </td>
                  <td className="px-2 text-center font-semibold text-slate-200">{r.played}</td>
                  <td className={cn('px-2 text-center text-slate-300', hideCompact)}>{r.won}</td>
                  <td className={cn('px-2 text-center text-slate-300', hideCompact)}>{r.drawn}</td>
                  <td className={cn('px-2 text-center text-slate-300', hideCompact)}>{r.lost}</td>
                  <td className={cn('px-2 text-center text-slate-300', hideCompact)}>{r.goalsFor}</td>
                  <td className={cn('px-2 text-center text-slate-300', hideCompact)}>{r.goalsAgainst}</td>
                  <td className={cn('px-2 text-center font-semibold', r.goalDiff > 0 ? 'text-emerald-400' : r.goalDiff < 0 ? 'text-red-400' : 'text-slate-400')}>
                    {r.goalDiff > 0 ? `+${r.goalDiff}` : r.goalDiff}
                  </td>
                  <td className="px-2 pr-4 text-center">
                    <span className="digital text-2xl text-amber-300">{r.points}</span>
                  </td>
                  {!compact && (
                    <td className="hidden px-2 md:table-cell">
                      <div className="flex justify-center">
                        <FormDots form={r.form} size="sm" />
                      </div>
                    </td>
                  )}
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {!compact && (
        <div className="flex flex-wrap gap-x-6 gap-y-2 border-t border-white/10 bg-black/20 px-4 py-3 text-xs text-slate-400">
          <span className="inline-flex items-center gap-2"><i className="h-3 w-1 rounded bg-amber-400" /> Líder / campeón</span>
          <span className="inline-flex items-center gap-2"><i className="h-3 w-1 rounded bg-emerald-500" /> Play-off de ascenso (top {category.playoffSpots})</span>
          <span className="inline-flex items-center gap-2"><i className="h-3 w-1 rounded bg-red-500" /> Zona de peligro (últimos {category.relegationSpots})</span>
          <span className="ml-auto hidden text-slate-500 sm:block">Desempate: diferencia de goles → goles a favor</span>
        </div>
      )}
    </div>
  );
}
