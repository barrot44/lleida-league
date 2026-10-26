import { useState } from 'react';
import { Headphones, Volume2 } from 'lucide-react';
import type { ObsState, SfxKind } from '@/obs/types';
import { SFX_LIST, playSfx } from '@/obs/sfx';
import { useObsStore } from '@/obs/useObsStore';
import { SectionCard } from '@/components/admin/fields';
import { Toggle } from '@/components/admin/obs/Toggle';
import type { useObsActions } from '@/components/admin/obs/useObsActions';
import { cn } from '@/lib/utils';

type Actions = ReturnType<typeof useObsActions>;

/** Arena sounds played by the overlay inside OBS: automatic on goals, cards, dice… and one-tap buttons. */
export function SoundControls({ actions }: { actions: Actions }) {
  const snd = useObsStore((s) => s.state.sound);
  const [hearHere, setHearHere] = useState(false);
  const set = (patch: Partial<ObsState['sound']>) => actions.update((s) => ({ ...s, sound: { ...s.sound, ...patch } }));

  const play = (kind: SfxKind) => {
    actions.playSound(kind);
    if (hearHere) playSfx(kind, snd.volume);
  };

  return (
    <SectionCard title="Sons del pavelló" actions={<Toggle small checked={snd.enabled} onChange={(v) => set({ enabled: v })} label="Sons activats" />}>
      <div className={cn('grid grid-cols-3 gap-2 sm:grid-cols-4', !snd.enabled && 'pointer-events-none opacity-40')}>
        {SFX_LIST.map((x) => (
          <button key={x.id} onClick={() => play(x.id)} className="flex flex-col items-center gap-1 rounded-2xl border border-white/10 bg-white/[0.03] px-2 py-3 transition hover:border-amber-400/60 hover:bg-amber-400/10 active:scale-95">
            <span className="text-2xl leading-none">{x.emoji}</span>
            <span className="text-xs font-bold uppercase tracking-wide text-slate-200">{x.label}</span>
          </button>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3">
        <Toggle small checked={snd.auto} onChange={(v) => set({ auto: v })} label="Automàtics" hint="Gol, targetes, temps morts, daus, cartes i situacions." />
        <Toggle small checked={hearHere} onChange={setHearHere} label="Escolta’ls també aquí" hint="Per provar-los des del panell." />
      </div>
      <label className="mt-4 flex items-center gap-3 text-sm font-bold text-slate-300">
        <Volume2 size={16} className="shrink-0 text-amber-300" />
        <input type="range" min={0} max={1} step={0.05} value={snd.volume} onChange={(e) => set({ volume: Number(e.target.value) })} className="w-full accent-amber-400" aria-label="Volum" />
        <span className="w-10 text-right tabular-nums">{Math.round(snd.volume * 100)}%</span>
      </label>
      <p className="mt-3 flex gap-2 text-[11px] leading-relaxed text-slate-500">
        <Headphones size={14} className="mt-0.5 shrink-0" />
        Els sons surten de la capa dins d’OBS. A les propietats de la font de navegador marca <strong className="text-slate-300">«Controla l’àudio via OBS»</strong> perquè entrin al directe (la capa afegida des d’aquí ja ho porta).
      </p>
    </SectionCard>
  );
}
