import { useEffect, useMemo, useState } from 'react';
import { Clapperboard, Film, Loader2, Play, Rewind, Snail, Sparkles, Star, Trash2, TriangleAlert } from 'lucide-react';
import type { ObsExecStatus } from '@/obs/types';
import { onExecStatus } from '@/obs/bus';
import { REPLAY_SCENE } from '@/obs/executor';
import { matchMinute } from '@/obs/state';
import { useObsStore } from '@/obs/useObsStore';
import { useObsLink } from '@/obs/useObsLink';
import { useUiStore } from '@/store/useUiStore';
import { useNow } from '@/hooks/useNow';
import { SectionCard } from '@/components/admin/fields';
import { Toggle } from '@/components/admin/obs/Toggle';
import type { useObsActions } from '@/components/admin/obs/useObsActions';
import { cn, uid } from '@/lib/utils';

type Actions = ReturnType<typeof useObsActions>;

/** Latest report of the overlay that controls OBS (null when none has spoken recently). */
function useExecStatus() {
  const [status, setStatus] = useState<ObsExecStatus | null>(null);
  const now = useNow(3000);
  useEffect(() => onExecStatus(setStatus), []);
  return status && now - status.at < 12_000 ? status : null;
}

/** Scenes with the logo transition, replays and the "plays of the match" reel. */
export function ProductionControls({ actions }: { actions: Actions }) {
  const exec = useExecStatus();
  const link = useObsLink();
  const state = useObsStore((s) => s.state);
  const toast = useUiStore((s) => s.toast);
  const [withTransition, setWithTransition] = useState(true);
  const [label, setLabel] = useState('');

  const execOn = !!exec?.connected;
  const scenes = (execOn ? exec.scenes : link.status === 'on' ? link.scenes : []).filter((s) => s !== REPLAY_SCENE);
  const current = execOn ? exec.currentScene : link.currentScene;
  const known = useMemo(() => new Set(exec?.clips ?? []), [exec?.clips]);
  const clips = [...state.clips].sort((a, b) => a.at - b.at);
  const starred = clips.filter((c) => c.starred);

  const goScene = (scene: string) => {
    if (execOn) return actions.sendCmd({ type: 'scene', scene, transition: withTransition });
    // Only the panel is connected: sting on the overlay and switch while it covers the screen (allowing for the delay).
    if (withTransition) {
      actions.sting();
      window.setTimeout(() => void link.setScene(scene), 750);
    } else void link.setScene(scene);
  };

  const suggestLabel = () => {
    const sb = state.scoreboard;
    const f = state.flash;
    if (f?.kind === 'goal' && Date.now() - f.at < 90_000) return `${f.ownGoal ? 'Gol en pròpia' : 'Gol'}${f.player ? ` de ${f.player.name}` : ` ${f.team.shortName}`}${f.minute ? ` · ${f.minute}’` : ''}`;
    return sb.home ? `Jugada · ${matchMinute(sb.clock, sb.period)}’` : 'Jugada';
  };

  const replay = (slow: boolean) => {
    if (!execOn) return toast('La capa d’OBS encara no té el control (mira les instruccions de sota).', 'error');
    if (!exec.replayBuffer) return toast(exec.replayError ?? 'El buffer de repeticions d’OBS no està actiu.', 'error');
    const clipId = uid('clip');
    const text = label.trim() || suggestLabel();
    const sb = state.scoreboard;
    actions.sendCmd({ type: 'replay', clipId, label: text, slow }, (s) => ({
      clips: [...s.clips, { id: clipId, label: text, minute: sb.home ? matchMinute(sb.clock, sb.period) : null, at: Date.now(), starred: false }].slice(-40),
    }));
    setLabel('');
  };

  const playClips = (ids: string[], title: string) => {
    if (!execOn) return toast('La capa d’OBS no està connectada a OBS.', 'error');
    const playable = ids.filter((id) => known.has(id));
    if (!playable.length) return toast('Aquestes jugades no són a l’ordinador d’OBS.', 'error');
    actions.sendCmd({ type: 'play', clipIds: playable, title, slow: false });
  };

  const patchClips = (fn: (c: typeof clips) => typeof clips) => actions.update((s) => ({ ...s, clips: fn(s.clips) }));

  return (
    <SectionCard
      title="Realització"
      actions={
        <span className={cn('flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-black uppercase tracking-wider', execOn ? 'bg-emerald-500/15 text-emerald-300' : 'bg-white/5 text-slate-400')}>
          {exec?.busy ? <Loader2 size={12} className="animate-spin" /> : <span className={cn('h-2 w-2 rounded-full', execOn ? 'bg-emerald-400' : 'bg-slate-500')} />}
          {exec?.busy ?? (execOn ? 'La capa controla OBS' : 'Capa sense control d’OBS')}
        </span>
      }
    >
      {!execOn && (
        <div className="mb-4 flex gap-3 rounded-2xl border border-amber-400/30 bg-amber-400/[0.07] p-3 text-xs leading-relaxed text-amber-100">
          <TriangleAlert size={16} className="mt-0.5 shrink-0 text-amber-300" />
          <span>
            Per fer repeticions i transicions des de qualsevol dispositiu (també el mòbil), la capa d’OBS ha de poder controlar OBS: a l’ordinador d’OBS, connecta OBS a
            <strong> «Connexió amb OBS»</strong> i prem <strong>«Afegeix la capa a l’escena actual»</strong> (o copia l’enllaç amb control). {exec?.error && <em className="block text-amber-300">OBS diu: {exec.error}</em>}
          </span>
        </div>
      )}

      {/* Scenes */}
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="label !mb-0 flex items-center gap-1.5">
          <Clapperboard size={12} /> Escenes
        </p>
        <div className="flex items-center gap-3">
          <Toggle small checked={withTransition} onChange={setWithTransition} label="Amb la transició del logo" />
          <button className="btn-ghost !px-3 !py-1.5 text-xs" onClick={actions.sting}>
            <Sparkles size={13} /> Només transició
          </button>
        </div>
      </div>
      {scenes.length === 0 ? (
        <p className="rounded-xl border border-dashed border-white/10 px-3 py-4 text-center text-xs text-slate-500">Quan OBS estigui connectat hi veuràs les escenes.</p>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {scenes.map((name) => (
            <button
              key={name}
              onClick={() => goScene(name)}
              className={cn('truncate rounded-xl border px-3 py-2.5 text-left text-sm font-bold transition', current === name ? 'border-red-500 bg-red-500/15 text-white shadow-red' : 'border-white/10 text-slate-300 hover:border-amber-400/50')}
            >
              {current === name && <span className="mr-1.5 inline-block h-2 w-2 animate-pulse-live rounded-full bg-red-500" />}
              {name}
            </button>
          ))}
        </div>
      )}

      {/* Replay */}
      <div className="mt-5 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-3">
        <p className="label flex items-center gap-1.5">
          <Rewind size={12} /> Repetició (últims segons)
        </p>
        <input className="input !py-2" value={label} onChange={(e) => setLabel(e.target.value)} placeholder={`Etiqueta (si la deixes buida: «${suggestLabel()}»)`} />
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button className="btn-gold !py-3" disabled={!!exec?.busy} onClick={() => replay(false)}>
            <Rewind size={17} /> Repetició
          </button>
          <button className="btn-ghost !py-3" disabled={!!exec?.busy} onClick={() => replay(true)}>
            <Snail size={17} /> Càmera lenta
          </button>
        </div>
        {execOn && !exec.replayBuffer && <p className="mt-2 text-xs text-red-300">{exec.replayError}</p>}
        <p className="mt-2 text-[11px] text-slate-500">Desa la jugada, la mostra amb la transició del logo i torna sola al directe. Queda guardada a «Jugades del partit».</p>
      </div>

      {/* Plays of the match */}
      <div className="mt-5">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <p className="label !mb-0 flex items-center gap-1.5">
            <Film size={12} /> Jugades del partit ({clips.length})
          </p>
          <div className="flex gap-2">
            <button className="btn-gold !px-3 !py-1.5 text-xs" disabled={clips.length === 0 || !!exec?.busy} onClick={() => playClips((starred.length ? starred : clips).map((c) => c.id), 'Jugades del partit')}>
              <Play size={13} fill="currentColor" /> Resum {starred.length ? `(${starred.length} ⭐)` : `(${clips.length})`}
            </button>
            {clips.length > 0 && (
              <button className="btn-ghost !px-3 !py-1.5 text-xs" onClick={() => patchClips(() => [])}>
                <Trash2 size={13} /> Buida
              </button>
            )}
          </div>
        </div>
        {clips.length === 0 ? (
          <p className="rounded-xl border border-dashed border-white/10 px-3 py-4 text-center text-xs text-slate-500">Cada repetició que facis s’acumularà aquí. Marca les millors amb ⭐ i al descans o al final llança el resum.</p>
        ) : (
          <ul className="max-h-72 space-y-1.5 overflow-y-auto pr-1">
            {clips.map((c) => {
              const ok = !exec || known.has(c.id);
              return (
                <li key={c.id} className={cn('flex items-center gap-2 rounded-xl border px-2 py-1.5', c.starred ? 'border-amber-400/50 bg-amber-400/[0.07]' : 'border-white/[0.07] bg-white/[0.02]')}>
                  <button aria-label={c.starred ? 'Treu la estrella' : 'Marca com a destacada'} onClick={() => patchClips((l) => l.map((x) => (x.id === c.id ? { ...x, starred: !x.starred } : x)))} className={c.starred ? 'text-amber-300' : 'text-slate-600 hover:text-amber-300'}>
                    <Star size={17} fill={c.starred ? 'currentColor' : 'none'} />
                  </button>
                  <input
                    className="min-w-0 flex-1 bg-transparent text-sm font-bold text-white outline-none focus:text-amber-200"
                    value={c.label}
                    onChange={(e) => patchClips((l) => l.map((x) => (x.id === c.id ? { ...x, label: e.target.value } : x)))}
                    aria-label="Etiqueta de la jugada"
                  />
                  {!ok && <span className="text-[10px] font-bold uppercase text-slate-500">no disponible</span>}
                  <button className="btn-ghost !p-1.5" aria-label="Torna-la a reproduir" disabled={!ok || !!exec?.busy} onClick={() => playClips([c.id], 'Repetició')}>
                    <Play size={13} />
                  </button>
                  <button className="btn-ghost !p-1.5 hover:!text-red-300" aria-label="Esborra la jugada" onClick={() => patchClips((l) => l.filter((x) => x.id !== c.id))}>
                    <Trash2 size={13} />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </SectionCard>
  );
}
