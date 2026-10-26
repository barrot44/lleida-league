import { useState } from 'react';
import { Loader2, Music2, Volume1, Volume2, VolumeX, Wand2 } from 'lucide-react';
import { MUSIC_APPS } from '@/obs/music';
import { useUiStore } from '@/store/useUiStore';
import { SectionCard } from '@/components/admin/fields';
import { Toggle } from '@/components/admin/obs/Toggle';
import { useMusic } from '@/components/admin/obs/useScenes';
import type { useObsActions } from '@/components/admin/obs/useObsActions';
import { cn } from '@/lib/utils';

type Actions = ReturnType<typeof useObsActions>;

const LEVELS = [0.25, 0.5, 0.75, 1];

/** Background music for the start and half-time: Spotify (or any app) captured by OBS, faded in and out from here. */
export function MusicControls({ actions }: { actions: Actions }) {
  const toast = useUiStore((s) => s.toast);
  const { music, run, setOn, canControl, execStatus } = useMusic(actions);
  const [busy, setBusy] = useState(false);
  const custom = !MUSIC_APPS.some((a) => a.exe.toLowerCase() === music.app.toLowerCase());
  const set = (patch: Partial<typeof music>) => actions.update((s) => ({ ...s, music: { ...s.music, ...patch } }));

  const go = async (fn: () => Promise<void>, ok?: string) => {
    setBusy(true);
    try {
      await fn();
      if (ok) toast(ok);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'No s’ha pogut fer.', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SectionCard
      title="Música"
      actions={
        <button className={cn('btn !py-2', music.on ? 'bg-emerald-500 text-emerald-950 shadow-emerald hover:bg-emerald-400' : 'btn-ghost')} disabled={busy || !canControl} onClick={() => void go(() => setOn(!music.on))}>
          {busy ? <Loader2 size={16} className="animate-spin" /> : music.on ? <Volume2 size={16} /> : <VolumeX size={16} />}
          {music.on ? 'Sonant · Apaga-la' : 'Fes-la sonar'}
        </button>
      }
    >
      <ol className="space-y-1.5 text-sm text-slate-300">
        <li>
          <strong className="text-amber-300">1.</strong> A l’ordinador d’OBS obre l’app i posa-hi la llista (Spotify, YouTube al navegador…).
        </li>
        <li>
          <strong className="text-amber-300">2.</strong> Tria quina app és i prem <strong>«Prepara la música a OBS»</strong> (només el primer cop).
        </li>
        <li>
          <strong className="text-amber-300">3.</strong> Fes-la sonar o apaga-la amb una fosa suau. La cançó la tries a la mateixa app.
        </li>
      </ol>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {MUSIC_APPS.map((a) => (
          <button key={a.exe} onClick={() => set({ app: a.exe })} className={cn('rounded-lg border px-3 py-1.5 text-xs font-bold transition', music.app.toLowerCase() === a.exe.toLowerCase() ? 'border-amber-400 bg-amber-400/15 text-amber-200' : 'border-white/10 text-slate-400 hover:text-white')}>
            {a.label}
          </button>
        ))}
        <input className={cn('input !w-40 !py-1.5 text-xs', custom && '!border-amber-400')} value={custom ? music.app : ''} onChange={(e) => set({ app: e.target.value })} placeholder="Una altra: app.exe" aria-label="Programa (.exe)" />
      </div>
      <button className="btn-gold mt-3 w-full" disabled={busy || !canControl || !music.app.trim()} onClick={() => void go(() => run('setup', music.app, music.volume), 'Música preparada: ja la pots fer sonar.')}>
        <Wand2 size={16} /> Prepara la música a OBS
      </button>
      {!canControl && <p className="mt-2 text-xs text-amber-200">Connecta OBS (més amunt) o afegeix la capa amb control per fer-ho des d’aquí.</p>}
      {execStatus?.error && <p className="mt-2 text-xs text-red-300">{execStatus.error}</p>}
      {execStatus?.app && !execStatus.error && <p className="mt-2 text-xs text-emerald-300">🎵 Capturant: {execStatus.app}</p>}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
          <Volume1 size={14} /> Volum
        </span>
        {LEVELS.map((v) => (
          <button
            key={v}
            onClick={() => {
              set({ volume: v });
              if (music.on) void go(() => run('on', music.app, v));
            }}
            className={cn('rounded-lg border px-2.5 py-1 text-xs font-bold', music.volume === v ? 'border-amber-400 bg-amber-400/15 text-amber-200' : 'border-white/10 text-slate-400')}
          >
            {Math.round(v * 100)}%
          </button>
        ))}
      </div>
      <div className="mt-4">
        <Toggle small checked={music.auto} onChange={(v) => set({ auto: v })} label="Automàtica amb les situacions" hint="Sona a Prepartit, Descans i Final; s’apaga a Partit, Temps mort i Entrevista." />
      </div>
      <p className="mt-3 flex gap-2 text-[11px] leading-relaxed text-slate-500">
        <Music2 size={14} className="mt-0.5 shrink-0" /> OBS captura només el so d’aquella app (Windows 10/11), no el de tot l’ordinador. Compte amb els drets d’autor a YouTube i Twitch.
      </p>
    </SectionCard>
  );
}
