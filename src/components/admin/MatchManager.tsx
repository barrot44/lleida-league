import { useMemo, useState } from 'react';
import { Flag, Pencil, Play, Plus, Trash2 } from 'lucide-react';
import type { Match, MatchStatus } from '@/types';
import { MatchEditor, newMatchDraft } from '@/components/admin/MatchEditor';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { StatusBadge } from '@/components/ui/Badges';
import { TeamCrest } from '@/components/ui/TeamCrest';
import { CATEGORIES } from '@/config/site';
import { useLeagueStore } from '@/store/useLeagueStore';
import { useUiStore } from '@/store/useUiStore';
import { useLookups } from '@/hooks/useLeagueView';
import { celebrate } from '@/lib/confetti';
import { formatDay, matchTimestamp } from '@/lib/utils';

export function MatchManager() {
  const category = useUiStore((s) => s.category);
  const setCategory = useUiStore((s) => s.setCategory);
  const toast = useUiStore((s) => s.toast);
  const matches = useLeagueStore((s) => s.matches);
  const upsertMatch = useLeagueStore((s) => s.upsertMatch);
  const deleteMatch = useLeagueStore((s) => s.deleteMatch);
  const { teamMap } = useLookups();

  const catMatches = useMemo(() => matches.filter((m) => m.category === category).sort((a, b) => matchTimestamp(a) - matchTimestamp(b)), [matches, category]);
  const matchdays = useMemo(() => [...new Set(catMatches.map((m) => m.matchday))].sort((a, b) => a - b), [catMatches]);
  const currentMatchday = catMatches.find((m) => m.status !== 'finished')?.matchday ?? matchdays[matchdays.length - 1] ?? 1;

  // `null` = follow the current matchday of the selected category
  const [pickedMatchday, setMatchday] = useState<number | 'all' | null>(null);
  const matchday = pickedMatchday ?? currentMatchday;
  const [status, setStatus] = useState<MatchStatus | 'all'>('all');
  const [editing, setEditing] = useState<{ match: Match; isNew: boolean } | null>(null);
  const [removing, setRemoving] = useState<Match | null>(null);

  const visible = catMatches.filter((m) => (matchday === 'all' || m.matchday === matchday) && (status === 'all' || m.status === status));

  const quick = (m: Match, patch: Partial<Match>, message: string) => {
    const finished = upsertMatch({ ...m, ...patch });
    toast(message);
    if (finished) {
      const home = teamMap.get(m.homeTeamId);
      void celebrate([home?.primaryColor ?? '#FBBF24'], { big: true });
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-3">
        <label>
          <span className="label">Categoria</span>
          <select className="input !w-auto" value={category} onChange={(e) => { setCategory(e.target.value as typeof category); setMatchday(null); }}>
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="label">Jornada</span>
          <select className="input !w-auto" value={matchday} onChange={(e) => setMatchday(e.target.value === 'all' ? 'all' : Number(e.target.value))}>
            <option value="all">Totes</option>
            {matchdays.map((d) => (
              <option key={d} value={d}>
                Jornada {d}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="label">Estat</span>
          <select className="input !w-auto" value={status} onChange={(e) => setStatus(e.target.value as MatchStatus | 'all')}>
            <option value="all">Tots</option>
            <option value="live">En directe</option>
            <option value="scheduled">Propers</option>
            <option value="finished">Finalitzats</option>
          </select>
        </label>
        <button className="btn-gold ml-auto" onClick={() => setEditing({ match: newMatchDraft(category, matchday === 'all' ? currentMatchday : matchday), isNew: true })}>
          <Plus size={16} /> Nou partit
        </button>
      </div>

      <ul className="space-y-2.5">
        {visible.map((m) => {
          const home = teamMap.get(m.homeTeamId);
          const away = teamMap.get(m.awayTeamId);
          if (!home || !away) return null;
          return (
            <li key={m.id} className="card flex flex-wrap items-center gap-x-5 gap-y-3 px-4 py-3">
              <div className="w-28 shrink-0">
                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">J{m.matchday}</p>
                <p className="text-xs text-slate-400">
                  {formatDay(m.date)} · {m.time}
                </p>
              </div>
              <div className="flex min-w-[240px] flex-1 items-center justify-center gap-3">
                <span className="flex flex-1 items-center justify-end gap-2 truncate font-display text-lg font-black uppercase text-white">
                  {home.shortName} <TeamCrest team={home} size={28} />
                </span>
                <span className="digital min-w-[4.5rem] rounded-lg bg-black/50 px-2 py-1 text-center text-2xl text-amber-300">
                  {m.status === 'scheduled' ? 'vs' : `${m.homeScore} - ${m.awayScore}`}
                </span>
                <span className="flex flex-1 items-center gap-2 truncate font-display text-lg font-black uppercase text-white">
                  <TeamCrest team={away} size={28} /> {away.shortName}
                </span>
              </div>
              <StatusBadge status={m.status} minute={m.liveMinute} />

              <div className="ml-auto flex flex-wrap items-center gap-2">
                {m.status === 'scheduled' && (
                  <button className="btn-ghost !px-3 !py-1.5 text-xs" onClick={() => quick(m, { status: 'live', homeScore: 0, awayScore: 0, liveMinute: 1 }, 'Partit en directe.')}>
                    <Play size={13} /> Inicia
                  </button>
                )}
                {m.status === 'live' && (
                  <>
                    <button className="btn-ghost !px-3 !py-1.5 text-xs" onClick={() => quick(m, { homeScore: (m.homeScore ?? 0) + 1 }, `Gol de ${home.shortName}.`)}>
                      +1 {home.shortName}
                    </button>
                    <button className="btn-ghost !px-3 !py-1.5 text-xs" onClick={() => quick(m, { awayScore: (m.awayScore ?? 0) + 1 }, `Gol de ${away.shortName}.`)}>
                      +1 {away.shortName}
                    </button>
                    <button className="btn-gold !px-3 !py-1.5 text-xs" onClick={() => quick(m, { status: 'finished' }, 'Resultat actualitzat amb èxit!')}>
                      <Flag size={13} /> Finalitza
                    </button>
                  </>
                )}
                <button className="btn-ghost !p-2.5" aria-label="Edita el partit" onClick={() => setEditing({ match: m, isNew: false })}>
                  <Pencil size={15} />
                </button>
                <button className="btn-danger !p-2.5" aria-label="Elimina el partit" onClick={() => setRemoving(m)}>
                  <Trash2 size={15} />
                </button>
              </div>
            </li>
          );
        })}
        {visible.length === 0 && <li className="card py-12 text-center text-slate-400">No hi ha partits amb aquests filtres.</li>}
      </ul>

      {editing && <MatchEditor key={editing.match.id} initial={editing.match} isNew={editing.isNew} onClose={() => setEditing(null)} />}

      <ConfirmDialog
        open={!!removing}
        title="Elimina el partit"
        message="S’eliminarà el partit i els seus esdeveniments. La classificació i les estadístiques es recalcularan automàticament."
        confirmLabel="Elimina"
        onCancel={() => setRemoving(null)}
        onConfirm={() => {
          if (removing) deleteMatch(removing.id);
          setRemoving(null);
          toast('Partit eliminat.');
        }}
      />
    </div>
  );
}
