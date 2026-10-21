import { useMemo, useState } from 'react';
import { Plus, RefreshCw, Save, Trash2 } from 'lucide-react';
import type { CategoryId, Match, MatchEvent, MatchEventType, MatchStatus } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Field, Stepper } from '@/components/admin/fields';
import { CATEGORIES } from '@/config/site';
import { useLeagueStore } from '@/store/useLeagueStore';
import { useUiStore } from '@/store/useUiStore';
import { celebrate } from '@/lib/confetti';
import { cn, toISODate, uid } from '@/lib/utils';

const STATUSES: { id: MatchStatus; label: string }[] = [
  { id: 'scheduled', label: 'Pròxim' },
  { id: 'live', label: 'En directe' },
  { id: 'finished', label: 'Finalitzat' },
];

const EVENT_LABEL: Record<MatchEventType, string> = {
  goal: '⚽ Gol',
  own_goal: '⚽ Gol en pròpia',
  yellow_card: '🟨 Groga',
  red_card: '🟥 Vermella',
};

const VENUES = ['Pavelló Manel Bosch (Torrefarrera)', 'Pavelló de Pardinyes', 'Pavelló Barris Nord', 'Pavelló Onze de Setembre', 'Pavelló Cappont', 'Pavelló La Mariola'];

export function newMatchDraft(category: CategoryId, matchday: number): Match {
  const teams = useLeagueStore.getState().teams.filter((t) => t.category === category);
  return {
    id: uid('m'),
    category,
    matchday,
    homeTeamId: teams[0]?.id ?? '',
    awayTeamId: teams[1]?.id ?? '',
    homeScore: null,
    awayScore: null,
    status: 'scheduled',
    date: toISODate(new Date()),
    time: '20:00',
    venue: VENUES[0],
    events: [],
  };
}

/** Score implied by the registered goals (an own goal benefits the opposing team). */
function scoreFromEvents(match: Match) {
  let home = 0;
  let away = 0;
  for (const e of match.events) {
    if (e.type !== 'goal' && e.type !== 'own_goal') continue;
    const forHome = (e.teamId === match.homeTeamId) === (e.type === 'goal');
    if (forHome) home++;
    else away++;
  }
  return { home, away };
}

export function MatchEditor({ initial, isNew, onClose }: { initial: Match; isNew: boolean; onClose: () => void }) {
  const teams = useLeagueStore((s) => s.teams);
  const players = useLeagueStore((s) => s.players);
  const upsertMatch = useLeagueStore((s) => s.upsertMatch);
  const toast = useUiStore((s) => s.toast);
  const [draft, setDraft] = useState<Match>(initial);

  const catTeams = useMemo(() => teams.filter((t) => t.category === draft.category), [teams, draft.category]);
  const home = teams.find((t) => t.id === draft.homeTeamId);
  const away = teams.find((t) => t.id === draft.awayTeamId);
  const squad = useMemo(
    () => players.filter((p) => p.teamId === draft.homeTeamId || p.teamId === draft.awayTeamId).sort((a, b) => (a.teamId === b.teamId ? a.dorsal - b.dorsal : a.teamId === draft.homeTeamId ? -1 : 1)),
    [players, draft.homeTeamId, draft.awayTeamId],
  );

  const started = draft.status !== 'scheduled';
  const implied = scoreFromEvents(draft);
  const mismatch = started && (implied.home !== (draft.homeScore ?? 0) || implied.away !== (draft.awayScore ?? 0)) && draft.events.some((e) => e.type === 'goal' || e.type === 'own_goal');

  const patch = (p: Partial<Match>) => setDraft((d) => ({ ...d, ...p }));

  const changeTeams = (homeTeamId: string, awayTeamId: string) =>
    setDraft((d) => {
      const events = d.events.filter((e) => e.teamId === homeTeamId || e.teamId === awayTeamId);
      const mvpOk = d.mvpPlayerId && players.find((p) => p.id === d.mvpPlayerId && (p.teamId === homeTeamId || p.teamId === awayTeamId));
      return { ...d, homeTeamId, awayTeamId, events, mvpPlayerId: mvpOk ? d.mvpPlayerId : undefined };
    });

  const changeCategory = (category: CategoryId) => {
    const list = teams.filter((t) => t.category === category);
    setDraft((d) => ({ ...d, category, homeTeamId: list[0]?.id ?? '', awayTeamId: list[1]?.id ?? '', events: [], mvpPlayerId: undefined }));
  };

  const changeStatus = (status: MatchStatus) =>
    setDraft((d) => ({
      ...d,
      status,
      homeScore: status === 'scheduled' ? null : (d.homeScore ?? 0),
      awayScore: status === 'scheduled' ? null : (d.awayScore ?? 0),
      liveMinute: status === 'live' ? (d.liveMinute ?? 1) : undefined,
    }));

  const addEvent = (type: MatchEventType) => {
    const homeSquad = players.filter((p) => p.teamId === draft.homeTeamId);
    const first = homeSquad.find((p) => p.position !== 'Portero') ?? homeSquad[0] ?? squad[0];
    if (!first) {
      toast('Afegeix jugadors als equips abans de registrar esdeveniments.', 'error');
      return;
    }
    const last = draft.events[draft.events.length - 1];
    const ev: MatchEvent = { id: uid('e'), minute: last ? Math.min(40, last.minute) : 1, type, playerId: first.id, playerName: first.name, teamId: first.teamId };
    patch({ events: [...draft.events, ev] });
  };

  const updateEvent = (id: string, p: Partial<MatchEvent>) => patch({ events: draft.events.map((e) => (e.id === id ? { ...e, ...p } : e)) });

  const setEventPlayer = (id: string, playerId: string) => {
    const pl = players.find((p) => p.id === playerId);
    if (pl) updateEvent(id, { playerId, playerName: pl.name, teamId: pl.teamId, assistPlayerId: undefined, assistPlayerName: undefined });
  };

  const setEventAssist = (id: string, playerId: string) => {
    const pl = players.find((p) => p.id === playerId);
    updateEvent(id, { assistPlayerId: pl?.id, assistPlayerName: pl?.name });
  };

  const save = () => {
    if (!draft.homeTeamId || !draft.awayTeamId) return toast('Selecciona els dos equips.', 'error');
    if (draft.homeTeamId === draft.awayTeamId) return toast('L’equip local i el visitant no poden ser el mateix.', 'error');
    if (!draft.date) return toast('Indica la data del partit.', 'error');
    const events = [...draft.events].sort((a, b) => a.minute - b.minute);
    const becameFinished = upsertMatch({ ...draft, events });
    toast(isNew ? 'Partit creat amb èxit!' : draft.status === 'finished' ? 'Resultat actualitzat amb èxit!' : 'Partit actualitzat amb èxit.');
    if (becameFinished) void celebrate([home?.primaryColor ?? '#FBBF24', away?.primaryColor ?? '#06B6D4'], { big: true });
    onClose();
  };

  return (
    <Modal open onOpenChange={(o) => !o && onClose()} title={isNew ? 'Nou partit' : 'Edita el partit'} size="xl">
      <div className="space-y-7 p-5 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Categoria">
            <select className="input" value={draft.category} onChange={(e) => changeCategory(e.target.value as CategoryId)}>
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Jornada">
            <input type="number" min={1} className="input" value={draft.matchday} onChange={(e) => patch({ matchday: Math.max(1, Number(e.target.value) || 1) })} />
          </Field>
          <Field label="Data">
            <input type="date" className="input" value={draft.date} onChange={(e) => patch({ date: e.target.value })} />
          </Field>
          <Field label="Hora">
            <input type="time" className="input" value={draft.time} onChange={(e) => patch({ time: e.target.value })} />
          </Field>
          <Field label="Equip local" className="sm:col-span-1">
            <select className="input" value={draft.homeTeamId} onChange={(e) => changeTeams(e.target.value, draft.awayTeamId)}>
              {catTeams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Equip visitant">
            <select className="input" value={draft.awayTeamId} onChange={(e) => changeTeams(draft.homeTeamId, e.target.value)}>
              {catTeams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Pista / pavelló" className="sm:col-span-2">
            <input className="input" list="venues" value={draft.venue} onChange={(e) => patch({ venue: e.target.value })} />
            <datalist id="venues">
              {VENUES.map((v) => (
                <option key={v} value={v} />
              ))}
            </datalist>
          </Field>
        </div>

        <div>
          <span className="label">Estat</span>
          <div className="inline-flex gap-1 rounded-2xl border border-white/10 bg-pitch/60 p-1" role="radiogroup" aria-label="Estat del partit">
            {STATUSES.map((s) => (
              <button
                key={s.id}
                role="radio"
                aria-checked={draft.status === s.id}
                onClick={() => changeStatus(s.id)}
                className={cn(
                  'rounded-xl px-4 py-2 font-display text-sm font-black uppercase tracking-wide transition',
                  draft.status === s.id
                    ? s.id === 'live'
                      ? 'bg-red-500 text-white shadow-red'
                      : s.id === 'finished'
                        ? 'bg-emerald-500 text-emerald-950 shadow-emerald'
                        : 'bg-cyan-500 text-cyan-950 shadow-cyan'
                    : 'text-slate-400 hover:text-white',
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {started && (
          <section className="scoreboard rounded-3xl border border-white/10 p-5">
            <p className="mb-4 text-center text-xs font-black uppercase tracking-[0.25em] text-amber-400">Marcador {draft.status === 'live' ? 'en directe' : 'final'}</p>
            <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4">
              <div className="text-center">
                <p className="mb-2 max-w-[11rem] truncate font-display text-lg font-black uppercase text-white">{home?.shortName ?? 'Local'}</p>
                <Stepper big label="Gols local" value={draft.homeScore ?? 0} onChange={(n) => patch({ homeScore: n })} />
              </div>
              <span className="digital text-4xl text-slate-600">:</span>
              <div className="text-center">
                <p className="mb-2 max-w-[11rem] truncate font-display text-lg font-black uppercase text-white">{away?.shortName ?? 'Visitant'}</p>
                <Stepper big label="Gols visitant" value={draft.awayScore ?? 0} onChange={(n) => patch({ awayScore: n })} />
              </div>
            </div>
            {draft.status === 'live' && (
              <div className="mt-4 flex items-center justify-center gap-3 text-sm text-slate-400">
                Minut actual <Stepper label="Minut" value={draft.liveMinute ?? 1} min={1} max={60} onChange={(n) => patch({ liveMinute: n })} />
              </div>
            )}
            {mismatch && (
              <div className="mt-4 flex flex-wrap items-center justify-center gap-3 rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-2.5 text-sm text-amber-200">
                Els gols registrats donen {implied.home}-{implied.away}.
                <button className="btn-ghost !px-3 !py-1.5 text-xs" onClick={() => patch({ homeScore: implied.home, awayScore: implied.away })}>
                  <RefreshCw size={13} /> Sincronitza el marcador
                </button>
              </div>
            )}
          </section>
        )}

        {started && (
          <section>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-xl">Golejadors i targetes</h3>
              <div className="flex flex-wrap gap-2">
                {(['goal', 'own_goal', 'yellow_card', 'red_card'] as MatchEventType[]).map((t) => (
                  <button key={t} className="btn-ghost !px-3 !py-1.5 text-xs" onClick={() => addEvent(t)}>
                    <Plus size={13} /> {EVENT_LABEL[t]}
                  </button>
                ))}
              </div>
            </div>
            {draft.events.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-white/10 py-8 text-center text-sm text-slate-500">
                Encara no hi ha esdeveniments. Afegeix gols, targetes… i se sumaran a les estadístiques dels jugadors en finalitzar el partit.
              </p>
            ) : (
              <ul className="space-y-2">
                {draft.events.map((e) => {
                  const mates = players.filter((p) => p.teamId === e.teamId && p.id !== e.playerId);
                  return (
                    <li key={e.id} className="grid grid-cols-[4.5rem_1fr_auto] items-center gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-2.5 sm:grid-cols-[4.5rem_10rem_1fr_1fr_auto]">
                      <input
                        type="number"
                        min={0}
                        max={60}
                        aria-label="Minut"
                        className="input !px-2 text-center"
                        value={e.minute}
                        onChange={(ev) => updateEvent(e.id, { minute: Math.min(60, Math.max(0, Number(ev.target.value) || 0)) })}
                      />
                      <select aria-label="Tipus d’esdeveniment" className="input" value={e.type} onChange={(ev) => updateEvent(e.id, { type: ev.target.value as MatchEventType, assistPlayerId: undefined, assistPlayerName: undefined })}>
                        {(Object.keys(EVENT_LABEL) as MatchEventType[]).map((t) => (
                          <option key={t} value={t}>
                            {EVENT_LABEL[t]}
                          </option>
                        ))}
                      </select>
                      <select aria-label="Jugador" className="input col-span-3 sm:col-span-1" value={e.playerId} onChange={(ev) => setEventPlayer(e.id, ev.target.value)}>
                        {[home, away].map(
                          (t) =>
                            t && (
                              <optgroup key={t.id} label={t.name}>
                                {squad
                                  .filter((p) => p.teamId === t.id)
                                  .map((p) => (
                                    <option key={p.id} value={p.id}>
                                      #{p.dorsal} {p.name}
                                    </option>
                                  ))}
                              </optgroup>
                            ),
                        )}
                      </select>
                      {e.type === 'goal' ? (
                        <select aria-label="Assistència" className="input col-span-3 sm:col-span-1" value={e.assistPlayerId ?? ''} onChange={(ev) => setEventAssist(e.id, ev.target.value)}>
                          <option value="">Sense assistència</option>
                          {mates.map((p) => (
                            <option key={p.id} value={p.id}>
                              Assist. #{p.dorsal} {p.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="hidden text-xs text-slate-500 sm:block">{e.type === 'own_goal' ? 'El gol compta per al rival' : ''}</span>
                      )}
                      <button className="btn-danger !p-2.5" aria-label="Elimina l’esdeveniment" onClick={() => patch({ events: draft.events.filter((x) => x.id !== e.id) })}>
                        <Trash2 size={15} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        )}

        {draft.status === 'finished' && (
          <Field label="MVP del partit">
            <select className="input" value={draft.mvpPlayerId ?? ''} onChange={(e) => patch({ mvpPlayerId: e.target.value || undefined })}>
              <option value="">Sense MVP</option>
              {[home, away].map(
                (t) =>
                  t && (
                    <optgroup key={t.id} label={t.name}>
                      {squad
                        .filter((p) => p.teamId === t.id)
                        .map((p) => (
                          <option key={p.id} value={p.id}>
                            #{p.dorsal} {p.name}
                          </option>
                        ))}
                    </optgroup>
                  ),
              )}
            </select>
          </Field>
        )}

        <div className="flex flex-wrap justify-end gap-3 border-t border-white/10 pt-5">
          <button className="btn-ghost" onClick={onClose}>
            Cancel·la
          </button>
          <button className="btn-gold" onClick={save}>
            <Save size={16} /> Desa el partit
          </button>
        </div>
      </div>
    </Modal>
  );
}
