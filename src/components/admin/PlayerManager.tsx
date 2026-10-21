import { useMemo, useState } from 'react';
import { Pencil, Plus, Save, Trash2 } from 'lucide-react';
import type { Player, PlayerStats, Position } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { PlayerAvatar } from '@/components/ui/PlayerAvatar';
import { PositionTag } from '@/components/ui/Badges';
import { Field, Stepper } from '@/components/admin/fields';
import { CATEGORIES, POSITIONS, POSITION_LABEL } from '@/config/site';
import { emptyStats } from '@/lib/standings';
import { useLeagueStore } from '@/store/useLeagueStore';
import { useUiStore } from '@/store/useUiStore';
import { uid } from '@/lib/utils';

const STAT_FIELDS: { key: keyof PlayerStats; label: string }[] = [
  { key: 'goals', label: 'Gols' },
  { key: 'assists', label: 'Assistències' },
  { key: 'yellowCards', label: 'Grogues' },
  { key: 'redCards', label: 'Vermelles' },
  { key: 'mvpAwards', label: 'MVPs' },
  { key: 'matchesPlayed', label: 'Partits' },
];

function PlayerEditor({ initial, isNew, onClose }: { initial: Player; isNew: boolean; onClose: () => void }) {
  const teams = useLeagueStore((s) => s.teams);
  const upsertPlayer = useLeagueStore((s) => s.upsertPlayer);
  const setPlayerTotals = useLeagueStore((s) => s.setPlayerTotals);
  const toast = useUiStore((s) => s.toast);
  const [p, setP] = useState<Player>(initial);
  const [totals, setTotals] = useState<PlayerStats>(initial.stats);
  const patch = (x: Partial<Player>) => setP((d) => ({ ...d, ...x }));
  const team = teams.find((t) => t.id === p.teamId);

  const save = () => {
    if (!p.name.trim()) return toast('El jugador necessita un nom.', 'error');
    if (!p.teamId) return toast('Selecciona un equip.', 'error');
    upsertPlayer({ ...p, name: p.name.trim(), nickname: p.nickname?.trim() || undefined, photoUrl: p.photoUrl.trim() });
    const changed = Object.fromEntries((Object.keys(totals) as (keyof PlayerStats)[]).filter((k) => totals[k] !== initial.stats[k]).map((k) => [k, totals[k]]));
    if (Object.keys(changed).length > 0) setPlayerTotals(p.id, changed);
    toast(isNew ? 'Jugador afegit amb èxit!' : 'Jugador actualitzat amb èxit!');
    onClose();
  };

  return (
    <Modal open onOpenChange={(o) => !o && onClose()} title={isNew ? 'Nou jugador' : 'Edita el jugador'} size="lg">
      <div className="space-y-6 p-5 sm:p-6">
        <div className="grid gap-6 md:grid-cols-[auto_1fr]">
          <div className="flex flex-col items-center gap-2">
            <PlayerAvatar player={p} team={team} size={110} />
            <p className="text-xs text-slate-500">Previsualització</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nom" className="sm:col-span-2">
              <input className="input" value={p.name} onChange={(e) => patch({ name: e.target.value })} />
            </Field>
            <Field label="Malnom (opcional)">
              <input className="input" value={p.nickname ?? ''} onChange={(e) => patch({ nickname: e.target.value })} />
            </Field>
            <Field label="Dorsal">
              <input type="number" min={0} max={99} className="input" value={p.dorsal} onChange={(e) => patch({ dorsal: Math.min(99, Math.max(0, Number(e.target.value) || 0)) })} />
            </Field>
            <Field label="Equip">
              <select className="input" value={p.teamId} onChange={(e) => patch({ teamId: e.target.value })}>
                {CATEGORIES.map((c) => (
                  <optgroup key={c.id} label={c.label}>
                    {teams
                      .filter((t) => t.category === c.id)
                      .map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                  </optgroup>
                ))}
              </select>
            </Field>
            <Field label="Posició">
              <select className="input" value={p.position} onChange={(e) => patch({ position: e.target.value as Position })}>
                {POSITIONS.map((pos) => (
                  <option key={pos} value={pos}>
                    {POSITION_LABEL[pos]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="URL de la foto (opcional)" className="sm:col-span-2" hint="Buit = avatar generat amb els colors de l’equip.">
              <input className="input" value={p.photoUrl} onChange={(e) => patch({ photoUrl: e.target.value })} placeholder="https://…/foto.jpg" />
            </Field>
          </div>
        </div>

        <section>
          <h3 className="mb-1 text-lg">Estadístiques acumulades</h3>
          <p className="mb-4 text-xs text-slate-500">
            Els partits finalitzats sumen automàticament. Si modifiques un total aquí, la diferència es guarda com a ajust manual i es manté en recalcular.
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {STAT_FIELDS.map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2">
                <span className="text-sm font-semibold text-slate-300">{label}</span>
                <Stepper label={label} value={totals[key]} onChange={(n) => setTotals((t) => ({ ...t, [key]: n }))} />
              </div>
            ))}
          </div>
        </section>

        <div className="flex justify-end gap-3 border-t border-white/10 pt-5">
          <button className="btn-ghost" onClick={onClose}>
            Cancel·la
          </button>
          <button className="btn-gold" onClick={save}>
            <Save size={16} /> Desa el jugador
          </button>
        </div>
      </div>
    </Modal>
  );
}

export function PlayerManager() {
  const teams = useLeagueStore((s) => s.teams);
  const players = useLeagueStore((s) => s.players);
  const deletePlayer = useLeagueStore((s) => s.deletePlayer);
  const category = useUiStore((s) => s.category);
  const setCategory = useUiStore((s) => s.setCategory);
  const toast = useUiStore((s) => s.toast);

  const catTeams = useMemo(() => teams.filter((t) => t.category === category), [teams, category]);
  const [teamId, setTeamId] = useState<string>('');
  const activeTeam = catTeams.find((t) => t.id === teamId) ?? catTeams[0];
  const list = useMemo(() => players.filter((p) => p.teamId === activeTeam?.id).sort((a, b) => a.dorsal - b.dorsal), [players, activeTeam]);

  const [editing, setEditing] = useState<{ player: Player; isNew: boolean } | null>(null);
  const [removing, setRemoving] = useState<Player | null>(null);

  const blank = (): Player => ({
    id: uid('p'),
    name: '',
    dorsal: Math.max(0, ...list.map((p) => p.dorsal)) + 1,
    position: 'Ala',
    teamId: activeTeam?.id ?? '',
    photoUrl: '',
    stats: emptyStats(),
    adjustments: emptyStats(),
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-3">
        <label>
          <span className="label">Categoria</span>
          <select className="input !w-auto" value={category} onChange={(e) => { setCategory(e.target.value as typeof category); setTeamId(''); }}>
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="label">Equip</span>
          <select className="input !w-auto" value={activeTeam?.id ?? ''} onChange={(e) => setTeamId(e.target.value)}>
            {catTeams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        <button className="btn-gold ml-auto" disabled={!activeTeam} onClick={() => setEditing({ player: blank(), isNew: true })}>
          <Plus size={16} /> Nou jugador
        </button>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-black/30 text-[11px] uppercase tracking-[0.14em] text-slate-400">
              <th className="w-14 py-3 pl-4 text-left font-bold">#</th>
              <th className="py-3 text-left font-bold">Jugador</th>
              <th className="px-2 py-3 font-bold">Pos</th>
              <th className="px-2 py-3 font-bold">G</th>
              <th className="px-2 py-3 font-bold">A</th>
              <th className="px-2 py-3 font-bold">MVP</th>
              <th className="px-2 py-3 font-bold">🟨/🟥</th>
              <th className="py-3 pr-4" />
            </tr>
          </thead>
          <tbody>
            {list.map((p) => (
              <tr key={p.id} className="border-b border-white/[0.05] last:border-0 hover:bg-white/[0.03]">
                <td className="py-2 pl-4 font-display text-lg font-black text-amber-300">{p.dorsal}</td>
                <td className="py-2">
                  <div className="flex items-center gap-3">
                    <PlayerAvatar player={p} team={activeTeam} size={36} />
                    <div className="min-w-0">
                      <p className="truncate font-bold text-white">{p.name}</p>
                      {p.nickname && <p className="text-xs text-slate-500">“{p.nickname}”</p>}
                    </div>
                  </div>
                </td>
                <td className="px-2 text-center">
                  <PositionTag position={p.position} />
                </td>
                <td className="px-2 text-center font-semibold text-white">{p.stats.goals}</td>
                <td className="px-2 text-center text-slate-300">{p.stats.assists}</td>
                <td className="px-2 text-center text-slate-300">{p.stats.mvpAwards}</td>
                <td className="px-2 text-center text-slate-300">
                  {p.stats.yellowCards}/{p.stats.redCards}
                </td>
                <td className="py-2 pr-4">
                  <div className="flex justify-end gap-2">
                    <button className="btn-ghost !p-2" aria-label={`Edita ${p.name}`} onClick={() => setEditing({ player: p, isNew: false })}>
                      <Pencil size={14} />
                    </button>
                    <button className="btn-danger !p-2" aria-label={`Elimina ${p.name}`} onClick={() => setRemoving(p)}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {list.length === 0 && <p className="py-12 text-center text-slate-400">Aquest equip encara no té jugadors.</p>}
      </div>

      {editing && <PlayerEditor key={editing.player.id} initial={editing.player} isNew={editing.isNew} onClose={() => setEditing(null)} />}

      <ConfirmDialog
        open={!!removing}
        title="Elimina el jugador"
        message={`S’eliminarà ${removing?.name ?? 'aquest jugador'} de la plantilla. Els esdeveniments de partits ja registrats en conservaran el nom, però deixaran de comptar a les seves estadístiques.`}
        confirmLabel="Elimina el jugador"
        onCancel={() => setRemoving(null)}
        onConfirm={() => {
          if (removing) deletePlayer(removing.id);
          setRemoving(null);
          toast('Jugador eliminat.');
        }}
      />
    </div>
  );
}
