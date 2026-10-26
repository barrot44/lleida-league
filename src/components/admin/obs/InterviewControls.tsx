import { useState } from 'react';
import { Crown, EyeOff, Mic, Radio, UserRound } from 'lucide-react';
import type { ObsInterview, ObsTeam } from '@/obs/types';
import { POSITION_LABEL } from '@/config/site';
import { useObsStore } from '@/obs/useObsStore';
import { SectionCard } from '@/components/admin/fields';
import { Toggle } from '@/components/admin/obs/Toggle';
import { PlayerPicker } from '@/components/admin/obs/PlayerPicker';
import { TeamCrest } from '@/components/ui/TeamCrest';
import type { Side, useObsActions } from '@/components/admin/obs/useObsActions';
import { cn, uid } from '@/lib/utils';

type Actions = ReturnType<typeof useObsActions>;

const QUESTIONS = ['Com heu viscut el partit?', 'Què ha marcat la diferència?', 'Un missatge per a l’afició', 'Com arribeu al proper partit?', 'Com t’has sentit al camp?'];

/** Interview at the side of the court: who speaks, the question and the sponsors strip. */
export function InterviewControls({ actions }: { actions: Actions }) {
  const iv = useObsStore((s) => s.state.interview);
  const state = useObsStore((s) => s.state);
  const sb = state.scoreboard;
  const [picker, setPicker] = useState<Side | null>(null);

  const set = (patch: Partial<ObsInterview>) => actions.update((s) => ({ ...s, interview: { ...s.interview, ...patch } }));
  const teams: [Side, ObsTeam][] = (
    [
      ['home', sb.home],
      ['away', sb.away],
    ] as [Side, ObsTeam | null][]
  ).filter((x): x is [Side, ObsTeam] => !!x[1]);

  const onAir = () => actions.update((s) => ({ ...s, interview: { ...s.interview, visible: true, id: uid('iv') }, lower: { ...s.lower, visible: false } }));
  const pickTeam = picker ? (picker === 'home' ? sb.home : sb.away) : null;

  return (
    <SectionCard
      title="Mode entrevista"
      actions={
        iv.visible ? (
          <button className="btn-danger !py-2" onClick={() => set({ visible: false })}>
            <EyeOff size={15} /> Treu-la
          </button>
        ) : (
          <button className="btn-gold !py-2" disabled={!iv.name.trim()} onClick={onAir}>
            <Radio size={15} /> En antena
          </button>
        )
      }
    >
      {teams.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {teams.map(([side, t]) => (
            <div key={side} className="flex flex-wrap gap-1.5">
              <button className="btn-ghost !px-2.5 !py-1.5 text-xs" onClick={() => setPicker(side)}>
                <UserRound size={13} /> Jugador {t.shortName}
              </button>
              {t.presidentName && (
                <button className="btn-ghost !px-2.5 !py-1.5 text-xs" onClick={() => set({ name: t.presidentName ?? '', role: 'President', team: t })}>
                  <Crown size={13} /> President {t.shortName}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="grid gap-2 sm:grid-cols-2">
        <input className="input" value={iv.name} onChange={(e) => set({ name: e.target.value })} placeholder="Nom de qui parla" aria-label="Nom" />
        <input className="input" value={iv.role} onChange={(e) => set({ role: e.target.value })} placeholder="Càrrec (Jugador, Entrenador…)" aria-label="Càrrec" />
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <button onClick={() => set({ team: null })} className={cn('rounded-lg border px-2.5 py-1 text-xs font-bold', !iv.team ? 'border-amber-400 bg-amber-400/15 text-amber-200' : 'border-white/10 text-slate-400')}>
          Sense equip (logo de la lliga)
        </button>
        {teams.map(([side, t]) => (
          <button key={side} onClick={() => set({ team: t })} className={cn('flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-bold', iv.team?.id === t.id ? 'border-amber-400 bg-amber-400/15 text-amber-200' : 'border-white/10 text-slate-400')}>
            <TeamCrest team={t} size={16} /> {t.shortName}
          </button>
        ))}
      </div>

      <p className="label mt-4 flex items-center gap-1.5">
        <Mic size={12} /> Pregunta en pantalla (opcional)
      </p>
      <input className="input" value={iv.question} onChange={(e) => set({ question: e.target.value })} placeholder="Escriu la pregunta o tria’n una" />
      <div className="mt-2 flex flex-wrap gap-1.5">
        {QUESTIONS.map((q) => (
          <button key={q} onClick={() => set({ question: q })} className="rounded-lg border border-white/10 px-2 py-1 text-[11px] text-slate-300 hover:border-amber-400/50">
            {q}
          </button>
        ))}
        {iv.question && (
          <button onClick={() => set({ question: '' })} className="rounded-lg px-2 py-1 text-[11px] font-bold text-slate-500 hover:text-white">
            Treu la pregunta
          </button>
        )}
      </div>

      <div className="mt-4">
        <Toggle small checked={iv.sponsors} onChange={(v) => set({ sponsors: v })} label="Franja de patrocinadors a sota" hint="Fa servir els logos de «Marca i patrocinadors»." />
      </div>

      <PlayerPicker
        open={!!picker}
        title={`Qui parla? ${pickTeam?.name ?? ''}`}
        team={pickTeam ? actions.teamMap.get(pickTeam.id) : undefined}
        players={picker ? actions.squadOf(state, picker) : []}
        onPick={(p) => set({ name: p.nickname || p.name, role: `${POSITION_LABEL[p.position]} · #${p.dorsal}`, team: pickTeam })}
        onClose={() => setPicker(null)}
      />
    </SectionCard>
  );
}
