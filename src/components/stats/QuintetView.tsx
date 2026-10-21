import { useMemo, useState } from 'react';
import { Share2, Users } from 'lucide-react';
import type { CategoryId, Position } from '@/types';
import { ShareQuintetModal } from '@/components/social/ShareQuintetModal';
import { EmptyState } from '@/components/ui/Section';
import { PlayerAvatar } from '@/components/ui/PlayerAvatar';
import { TeamCrest } from '@/components/ui/TeamCrest';
import { POSITION_LABEL } from '@/config/site';
import { useLeagueView } from '@/hooks/useLeagueView';
import { buildQuintet } from '@/lib/quintet';
import { cn } from '@/lib/utils';
import { useUiStore } from '@/store/useUiStore';

const SPOTS: Record<Position, { x: number; y: number }[]> = {
  Pívot: [{ x: 50, y: 14 }],
  Ala: [
    { x: 20, y: 38 },
    { x: 80, y: 38 },
  ],
  Cierre: [{ x: 50, y: 61 }],
  Portero: [{ x: 50, y: 85 }],
};

const chip = (active: boolean) =>
  cn(
    'shrink-0 rounded-xl border px-3.5 py-2 font-display text-sm font-black uppercase tracking-wide transition',
    active ? 'border-amber-400 bg-gold-gradient text-slate-950 shadow-glow' : 'border-white/10 bg-white/[0.04] text-slate-300 hover:border-amber-400/50 hover:text-white',
  );

/** The five best players of a matchday (or the season), drawn on a futsal court. */
export function QuintetView({ category }: { category: CategoryId }) {
  const view = useLeagueView(category);
  const openModal = useUiStore((s) => s.openModal);
  const [pick, setPick] = useState<number | 'season' | null>(null);
  const [sharing, setSharing] = useState(false);

  const matchdays = useMemo(() => [...new Set(view.catMatches.filter((m) => m.status === 'finished').map((m) => m.matchday))].sort((a, b) => a - b), [view.catMatches]);
  const current = pick ?? matchdays[matchdays.length - 1] ?? null;
  const slots = useMemo(() => buildQuintet(view.catMatches, view.catPlayers, view.teamMap, current === 'season' ? null : current), [view.catMatches, view.catPlayers, view.teamMap, current]);
  const label = current === 'season' ? 'Temporada' : `Jornada ${current}`;

  if (matchdays.length === 0) return <EmptyState icon={<Users />} title="Encara sense quintet" hint="Quan hi hagi partits finalitzats, aquí apareixerà el quintet ideal de cada jornada." />;

  const counters: Partial<Record<Position, number>> = {};

  return (
    <div>
      <div className="hide-scrollbar -mx-4 mb-6 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0" role="tablist" aria-label="Jornada del quintet">
        {matchdays.map((d) => (
          <button key={d} role="tab" aria-selected={current === d} className={chip(current === d)} onClick={() => setPick(d)}>
            J{d}
          </button>
        ))}
        <button role="tab" aria-selected={current === 'season'} className={chip(current === 'season')} onClick={() => setPick('season')}>
          Temporada
        </button>
      </div>

      <div className="mx-auto max-w-lg">
        <div className="relative aspect-[4/5] overflow-hidden rounded-3xl border border-white/15 bg-gradient-to-b from-emerald-500/20 to-teal-950/60 shadow-card">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden>
            <g fill="none" stroke="rgba(255,255,255,.25)" strokeWidth="0.35">
              <rect x="3" y="3" width="94" height="94" rx="1.5" />
              <path d="M3 50h94" />
              <circle cx="50" cy="50" r="10" />
              <path d="M32 3v14a18 18 0 0 0 36 0V3" />
              <path d="M32 97V83a18 18 0 0 1 36 0v14" />
            </g>
          </svg>
          {slots.map((s) => {
            const idx = counters[s.role] ?? 0;
            counters[s.role] = idx + 1;
            const pos = SPOTS[s.role][idx] ?? SPOTS[s.role][0];
            return (
              <button
                key={s.player.id}
                onClick={() => openModal({ kind: 'player', id: s.player.id })}
                className="group absolute w-28 -translate-x-1/2 -translate-y-1/2 text-center sm:w-32"
                style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                aria-label={`${s.player.name}, ${POSITION_LABEL[s.role]}`}
              >
                <span className="relative inline-block">
                  <PlayerAvatar player={s.player} team={s.team} size={64} className="ring-4 ring-amber-400 transition-transform group-hover:scale-110" />
                  <span className="absolute -right-3 -top-2 rounded-full bg-amber-300 px-1.5 text-xs font-black text-slate-950">{s.points}</span>
                </span>
                <span className="mt-1 block font-display text-sm font-black uppercase leading-tight text-white drop-shadow sm:text-base">{s.player.name}</span>
                <span className="flex items-center justify-center gap-1 text-[11px] font-semibold text-emerald-100/90">
                  {s.team && <TeamCrest team={s.team} size={14} />} {POSITION_LABEL[s.role]}
                </span>
              </button>
            );
          })}
          {slots.length === 0 && <p className="absolute inset-0 grid place-items-center px-8 text-center text-sm text-slate-300">Aquesta jornada encara no té prou dades.</p>}
        </div>

        <p className="mt-4 text-center text-xs text-slate-500">Punts: gol ×3, assistència ×1,5, MVP ×4, porteria a zero ×3, targetes restant.</p>
        <div className="mt-4 flex justify-center">
          <button className="btn-ghost" onClick={() => setSharing(true)} disabled={slots.length === 0}>
            <Share2 size={16} /> Imatge per a xarxes
          </button>
        </div>
      </div>

      {sharing && <ShareQuintetModal category={category} slots={slots} label={label} open onClose={() => setSharing(false)} />}
    </div>
  );
}
