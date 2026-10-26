import { BarChart3, EyeOff, Minus, Plus, RotateCcw } from 'lucide-react';
import type { MatchStats } from '@/obs/types';
import { emptyMatchStats } from '@/obs/state';
import { useObsStore } from '@/obs/useObsStore';
import { useUiStore } from '@/store/useUiStore';
import { SectionCard } from '@/components/admin/fields';
import { TeamCrest } from '@/components/ui/TeamCrest';
import { STAT_ROWS } from '@/components/live/LiveStats';
import type { Side, useObsActions } from '@/components/admin/obs/useObsActions';

type Actions = ReturnType<typeof useObsActions>;

/** Tap the stats while the match is played; they go on air as a graphic and to the website's live page. */
export function StatsControls({ actions }: { actions: Actions }) {
  const stats = useObsStore((s) => s.state.stats);
  const sb = useObsStore((s) => s.state.scoreboard);
  const mainKind = useObsStore((s) => (s.state.main.visible ? s.state.main.graphic?.kind : null));
  const toast = useUiStore((s) => s.toast);

  const bump = (side: Side, key: keyof MatchStats, delta: number) => {
    actions.bumpStat(side, key, delta);
    // A shot on target is also a shot.
    if (key === 'onTarget' && delta > 0) actions.bumpStat(side, 'shots', delta);
  };

  const show = () => {
    const g = actions.statsGraphic(useObsStore.getState().state, 'En directe');
    if (!g) return toast('Tria els dos equips al marcador.', 'error');
    actions.showGraphic(g, 20);
  };

  if (!sb.home || !sb.away)
    return (
      <SectionCard title="Estadístiques en directe">
        <p className="text-xs text-slate-500">Tria els dos equips al marcador per començar a comptar xuts, faltes, córners…</p>
      </SectionCard>
    );

  const sides: [Side, NonNullable<typeof sb.home>][] = [
    ['home', sb.home],
    ['away', sb.away],
  ];

  return (
    <SectionCard
      title="Estadístiques en directe"
      actions={
        mainKind === 'stats' ? (
          <button className="btn-danger !py-2" onClick={actions.hideGraphic}>
            <EyeOff size={15} /> Amaga
          </button>
        ) : (
          <button className="btn-gold !py-2" onClick={show}>
            <BarChart3 size={15} /> En pantalla (20 s)
          </button>
        )
      }
    >
      <div className="mb-2 flex items-center justify-between font-display text-sm font-black uppercase text-white">
        <span className="flex items-center gap-2">
          <TeamCrest team={sb.home} size={22} /> {sb.home.shortName}
        </span>
        <span className="flex items-center gap-2">
          {sb.away.shortName} <TeamCrest team={sb.away} size={22} />
        </span>
      </div>
      <ul className="space-y-1.5">
        {STAT_ROWS.map(({ key, label }) => (
          <li key={key} className="flex items-center justify-between gap-1 rounded-xl border border-white/[0.06] bg-white/[0.02] px-1 py-1 sm:gap-2 sm:px-1.5">
            {sides.map(([side]) => {
              const controls = [
                <button key="-" className="btn-ghost !p-1 sm:!p-2" aria-label={`${label}: resta`} onClick={() => bump(side, key, -1)}>
                  <Minus size={14} />
                </button>,
                <span key="n" className="digital w-7 text-center text-xl text-white sm:w-9 sm:text-2xl">
                  {stats[side][key]}
                </span>,
                <button key="+" className="btn-gold !p-2 sm:!p-2.5" aria-label={`${label}: suma`} onClick={() => bump(side, key, 1)}>
                  <Plus size={16} />
                </button>,
              ];
              return (
                <div key={side} className={side === 'home' ? 'order-1 flex shrink-0 items-center gap-0.5 sm:gap-1' : 'order-3 flex shrink-0 items-center gap-0.5 sm:gap-1'}>
                  {side === 'home' ? controls : [...controls].reverse()}
                </div>
              );
            })}
            <span className="order-2 min-w-0 flex-1 text-center text-[10px] font-bold uppercase leading-tight tracking-wider text-slate-400 sm:text-[11px] sm:tracking-[0.15em]">{label}</span>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-[11px] text-slate-500">Les faltes també compten a les acumulades del marcador i les targetes es sumen soles. Surten a la pàgina /directe.</p>
        <button className="btn-ghost shrink-0 !px-3 !py-1.5 text-xs" onClick={() => actions.update((s) => ({ ...s, stats: { home: emptyMatchStats(), away: emptyMatchStats() } }))}>
          <RotateCcw size={13} /> Reinicia
        </button>
      </div>
    </SectionCard>
  );
}
