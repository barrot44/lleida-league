import { useState } from 'react';
import { ChevronDown, Coffee, Flag, Hourglass, Mic, Play, Settings2, Timer, type LucideIcon } from 'lucide-react';
import type { ObsState, SfxKind } from '@/obs/types';
import { SCREEN_DEFAULTS, pauseClock } from '@/obs/state';
import { useObsStore } from '@/obs/useObsStore';
import { useUiStore } from '@/store/useUiStore';
import { SectionCard } from '@/components/admin/fields';
import { Toggle } from '@/components/admin/obs/Toggle';
import { useScenes } from '@/components/admin/obs/useScenes';
import { autoNotify } from '@/components/admin/obs/autoNotify';
import type { useObsActions } from '@/components/admin/obs/useObsActions';
import { cn, uid } from '@/lib/utils';

type Actions = ReturnType<typeof useObsActions>;

interface Situation {
  id: string;
  label: string;
  hint: string;
  icon: LucideIcon;
  color: string;
  sound?: SfxKind;
}

export const SITUATIONS: Situation[] = [
  { id: 'prepartit', label: 'Prepartit', hint: 'Pantalla «Comencem aviat» i barra inferior', icon: Hourglass, color: '#38BDF8', sound: 'sting' },
  { id: 'partit', label: 'Partit', hint: 'Marcador en pantalla, fora pantalles (del descans passa a la 2a part)', icon: Play, color: '#22C55E', sound: 'whistle' },
  { id: 'temps-mort', label: 'Temps mort', hint: 'Atura el rellotge i mostra les estadístiques', icon: Timer, color: '#F59E0B', sound: 'horn' },
  { id: 'descans', label: 'Descans', hint: 'Període de descans i pantalla de descans', icon: Coffee, color: '#A855F7', sound: 'horn' },
  { id: 'entrevista', label: 'Entrevista', hint: 'Treu el marcador i posa el rètol d’entrevista', icon: Mic, color: '#EF4444' },
  { id: 'final', label: 'Final', hint: 'Període final i estadístiques finals', icon: Flag, color: '#FBBF24', sound: 'horn' },
];

/** One tap per moment of the match: changes the OBS scene (with the logo transition) and sets the graphics. */
export function SituationsControls({ actions }: { actions: Actions }) {
  const sit = useObsStore((s) => s.state.situations);
  const toast = useUiStore((s) => s.toast);
  const { scenes, current, goScene, canSwitch } = useScenes(actions);
  const [config, setConfig] = useState(false);

  const setSit = (patch: Partial<ObsState['situations']>) => actions.update((s) => ({ ...s, situations: { ...s.situations, ...patch } }));

  const apply = (x: Situation) => {
    const now = Date.now();
    const st = useObsStore.getState().state;
    if (x.id === 'descans' && st.scoreboard.period !== 'DESC') actions.setPeriod('DESC');
    if (x.id === 'final' && st.scoreboard.period !== 'FINAL') actions.setPeriod('FINAL');
    if (x.id === 'partit' && st.scoreboard.period === 'DESC') actions.setPeriod('2T');

    actions.update((s) => {
      const hidden = { main: { ...s.main, visible: false }, interview: { ...s.interview, visible: false }, screen: { ...s.screen, visible: false } };
      const sound = x.sound && s.sound.auto ? { ...s.sound, last: { id: uid('sfx'), at: now, kind: x.sound } } : s.sound;
      const base: ObsState = { ...s, ...hidden, sound, situations: { ...s.situations, active: x.id } };
      const stats = (title: string, sec: number) => {
        const g = actions.statsGraphic(s, title);
        return g ? { main: { visible: true, id: uid('g'), graphic: g, at: now, hideAt: sec ? now + sec * 1000 : null } } : {};
      };
      switch (x.id) {
        case 'prepartit':
          return {
            ...base,
            scoreboard: { ...s.scoreboard, visible: false },
            ticker: { ...s.ticker, visible: s.ticker.items.some((t) => t.trim()) },
            screen: { ...s.screen, visible: true, kind: 'starting', title: SCREEN_DEFAULTS.starting.title, subtitle: SCREEN_DEFAULTS.starting.subtitle },
          };
        case 'partit':
          return { ...base, scoreboard: { ...s.scoreboard, visible: true }, lower: { ...s.lower, visible: false } };
        case 'temps-mort':
          return { ...base, scoreboard: { ...s.scoreboard, visible: true, clock: pauseClock(s.scoreboard.clock, now) }, ...stats('Temps mort', 25) };
        case 'descans':
          return { ...base, screen: { ...s.screen, visible: true, kind: 'halftime', title: SCREEN_DEFAULTS.halftime.title, subtitle: SCREEN_DEFAULTS.halftime.subtitle } };
        case 'entrevista':
          return { ...base, scoreboard: { ...s.scoreboard, visible: false }, lower: { ...s.lower, visible: false }, interview: { ...s.interview, visible: !!s.interview.name.trim(), id: uid('iv') } };
        case 'final':
          return { ...base, scoreboard: { ...s.scoreboard, visible: true, clock: pauseClock(s.scoreboard.clock, now) }, ...stats('Final del partit', 0) };
        default:
          return base;
      }
    });

    if (x.id === 'prepartit' && st.situations.active !== 'prepartit') autoNotify('start', useObsStore.getState().state);
    if (x.id === 'final' && st.situations.active !== 'final') autoNotify('final', useObsStore.getState().state);
    if (x.id === 'entrevista' && !st.interview.name.trim()) toast('Escriu qui parla a «Mode entrevista» i el rètol sortirà.', 'info');
    const scene = sit.scenes[x.id];
    if (scene && canSwitch) goScene(scene, sit.transition);
    else if (sit.transition) actions.sting();
  };

  return (
    <SectionCard
      title="Situacions del partit"
      actions={<Toggle small checked={sit.transition} onChange={(v) => setSit({ transition: v })} label="Amb la transició del logo" />}
    >
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {SITUATIONS.map((x) => {
          const on = sit.active === x.id;
          const scene = sit.scenes[x.id];
          return (
            <button
              key={x.id}
              onClick={() => apply(x)}
              title={x.hint}
              className={cn('relative flex min-h-[96px] flex-col items-start justify-between gap-2 overflow-hidden rounded-2xl border p-3 text-left transition active:scale-[0.98]', on ? 'shadow-glow' : 'border-white/10 hover:border-white/30')}
              style={{ borderColor: on ? x.color : undefined, background: `linear-gradient(150deg, ${x.color}${on ? '55' : '22'}, rgba(8,11,17,.6) 70%)` }}
            >
              <span className="flex w-full items-center justify-between">
                <span className="grid h-9 w-9 place-items-center rounded-xl" style={{ background: x.color }}>
                  <x.icon size={19} color="#0b0f17" strokeWidth={2.6} />
                </span>
                {on && <span className="h-2.5 w-2.5 animate-pulse-live rounded-full bg-red-500" />}
              </span>
              <span>
                <span className="block font-display text-lg font-black uppercase leading-none text-white">{x.label}</span>
                <span className={cn('mt-1 block truncate text-[10px] font-bold uppercase tracking-wider', scene ? (current === scene ? 'text-red-300' : 'text-slate-400') : 'text-slate-600')}>
                  {scene ? `🎬 ${scene}` : 'Sense escena'}
                </span>
              </span>
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-slate-500">Cada botó canvia l’escena d’OBS amb la transició del logo i posa els gràfics que toquen (marcador, pantalla, estadístiques, entrevista…).</p>

      <button className="mt-4 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-white" onClick={() => setConfig((v) => !v)}>
        <ChevronDown size={14} className={cn('transition', config && 'rotate-180')} /> <Settings2 size={13} /> Escena d’OBS de cada situació
      </button>
      {config && (
        <div className="mt-3 space-y-2">
          {scenes.length === 0 && <p className="text-xs text-amber-200">Connecta OBS per triar les escenes de la llista (o escriu-ne el nom exacte).</p>}
          {SITUATIONS.map((x) => (
            <label key={x.id} className="grid grid-cols-[110px_1fr] items-center gap-2 text-sm font-bold text-slate-300">
              {x.label}
              {scenes.length > 0 ? (
                <select className="input !py-2" value={sit.scenes[x.id] ?? ''} onChange={(e) => setSit({ scenes: { ...sit.scenes, [x.id]: e.target.value } })}>
                  <option value="">— No canviïs d’escena —</option>
                  {[...new Set([...scenes, ...(sit.scenes[x.id] ? [sit.scenes[x.id]] : [])])].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              ) : (
                <input className="input !py-2" value={sit.scenes[x.id] ?? ''} onChange={(e) => setSit({ scenes: { ...sit.scenes, [x.id]: e.target.value } })} placeholder="Nom de l’escena d’OBS" />
              )}
            </label>
          ))}
        </div>
      )}
    </SectionCard>
  );
}
