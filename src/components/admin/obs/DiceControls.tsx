import { useState } from 'react';
import { ChevronDown, Dices, EyeOff, Film } from 'lucide-react';
import { diceResult } from '@/obs/types';
import { clockElapsed, periodMs } from '@/obs/state';
import { useObsStore } from '@/obs/useObsStore';
import { useNow } from '@/hooks/useNow';
import { SectionCard } from '@/components/admin/fields';
import { Toggle } from '@/components/admin/obs/Toggle';
import { DICE_DURATION } from '@/obs/overlay/DiceRoll';
import type { useObsActions } from '@/components/admin/obs/useObsActions';
import { cn, uid } from '@/lib/utils';

type Actions = ReturnType<typeof useObsActions>;

const PIPS: Record<number, number[]> = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };

function MiniFace({ n }: { n: number }) {
  return (
    <span className="grid h-12 w-12 grid-cols-3 grid-rows-3 gap-0.5 rounded-xl border-2 border-amber-400 bg-[#0b1226] p-1.5">
      {Array.from({ length: 9 }, (_, i) => (
        <span key={i} className="grid place-items-center">
          {PIPS[n].includes(i) && <span className="h-2 w-2 rounded-full bg-amber-300" />}
        </span>
      ))}
    </span>
  );
}

/** The public's dice throw in the last two minutes of the first half. */
export function DiceControls({ actions }: { actions: Actions }) {
  const dice = useObsStore((s) => s.state.dice);
  const sb = useObsStore((s) => s.state.scoreboard);
  const now = useNow(1000);
  const [showVideos, setShowVideos] = useState(false);

  const remaining = periodMs(sb.clock) - clockElapsed(sb.clock, now);
  const diceTime = sb.period === '1T' && sb.home && remaining <= 120_000 && remaining > 0;
  const onAir = !!dice.last && now - dice.last.at < DICE_DURATION;

  const setDice = (patch: Partial<typeof dice>) => actions.update((s) => ({ ...s, dice: { ...s.dice, ...patch } }));
  const setAt = (key: 'labels' | 'videos', i: number, value: string) => setDice({ [key]: dice[key].map((v, j) => (j === i ? value : v)) });

  const throwDice = (face: number) => {
    const result = diceResult(face);
    const id = uid('dice');
    const video = dice.videos[result - 1]?.trim();
    if (dice.playVideo && video) {
      // The overlay inside OBS waits for the animation to finish, then plays the video of that result.
      actions.sendCmd({ type: 'video', path: video, title: `Dau · ${result}`, label: dice.labels[result - 1] || `Resultat ${result}`, delay: DICE_DURATION - 1500 }, (s) => ({
        dice: { ...s.dice, last: { id, at: Date.now(), face, result } },
      }));
    } else setDice({ last: { id, at: Date.now(), face, result } });
  };

  return (
    <SectionCard
      title="Dau del públic"
      actions={
        <button className="btn-danger !py-2" disabled={!onAir} onClick={() => setDice({ last: null })}>
          <EyeOff size={15} /> Amaga
        </button>
      }
    >
      {diceTime && (
        <p className="mb-3 flex items-center gap-2 rounded-xl border border-amber-400/50 bg-amber-400/10 px-3 py-2 text-sm font-bold text-amber-200">
          <Dices size={16} /> Últims 2 minuts de la primera part: és l’hora del dau!
        </p>
      )}
      <p className="mb-2 text-xs text-slate-400">Toca la cara que ha sortit. El dau rodola a la pantalla i en mostra el resultat (el 5 compta com a 1 i el 6 com a 2).</p>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {[1, 2, 3, 4, 5, 6].map((f) => (
          <button
            key={f}
            onClick={() => throwDice(f)}
            className={cn('flex flex-col items-center gap-1.5 rounded-2xl border px-2 py-3 transition hover:border-amber-400/70 hover:bg-amber-400/10 active:scale-95', dice.last?.face === f && onAir ? 'border-amber-400 bg-amber-400/15 shadow-glow' : 'border-white/10')}
          >
            <MiniFace n={f} />
            <span className="text-xs font-black uppercase tracking-wide text-slate-300">{f > 4 ? `${f} = ${diceResult(f)}` : f}</span>
          </button>
        ))}
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {[1, 2, 3, 4].map((r) => (
          <label key={r} className="flex items-center gap-2">
            <span className="digital grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gold-gradient text-lg text-slate-950">{r}</span>
            <input className="input !py-2" value={dice.labels[r - 1] ?? ''} onChange={(e) => setAt('labels', r - 1, e.target.value)} placeholder={`Què passa amb un ${r}?`} aria-label={`Significat del resultat ${r}`} />
          </label>
        ))}
      </div>

      <button className="mt-4 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-white" onClick={() => setShowVideos((v) => !v)}>
        <ChevronDown size={14} className={cn('transition', showVideos && 'rotate-180')} /> Vídeos dels resultats
      </button>
      {showVideos && (
        <div className="mt-3 space-y-2 rounded-2xl border border-white/10 bg-pitch/50 p-3">
          <Toggle checked={dice.playVideo} onChange={(v) => setDice({ playVideo: v })} label="Després de l’animació, reprodueix el vídeo del resultat a OBS" hint="Cal que la capa controli OBS (targeta «Realització»)." />
          {[1, 2, 3, 4].map((r) => (
            <label key={r} className="flex items-center gap-2">
              <Film size={14} className="shrink-0 text-slate-500" />
              <span className="w-5 shrink-0 text-xs font-black text-amber-300">{r}</span>
              <input className="input !py-1.5 font-mono text-[11px]" value={dice.videos[r - 1] ?? ''} onChange={(e) => setAt('videos', r - 1, e.target.value)} placeholder="C:/…/DAU NUMERO 1.mp4" aria-label={`Vídeo del resultat ${r}`} />
            </label>
          ))}
          <p className="text-[11px] text-slate-500">Ruta del fitxer a l’ordinador on hi ha OBS.</p>
        </div>
      )}
    </SectionCard>
  );
}
