import { useMemo, useState } from 'react';
import { Pencil, Plus, Save, Trash2 } from 'lucide-react';
import type { CategoryId, Team } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { TeamCrest } from '@/components/ui/TeamCrest';
import { Field } from '@/components/admin/fields';
import { CATEGORIES } from '@/config/site';
import { useLeagueStore } from '@/store/useLeagueStore';
import { useUiStore } from '@/store/useUiStore';
import { uid } from '@/lib/utils';

const blank = (category: CategoryId): Team => ({
  id: uid('team'),
  name: '',
  shortName: '',
  presidentName: '',
  logoUrl: '',
  primaryColor: '#F59E0B',
  secondaryColor: '#111827',
  category,
  history: '',
});

function TeamEditor({ initial, isNew, onClose }: { initial: Team; isNew: boolean; onClose: () => void }) {
  const upsertTeam = useLeagueStore((s) => s.upsertTeam);
  const toast = useUiStore((s) => s.toast);
  const [t, setT] = useState<Team>(initial);
  const patch = (p: Partial<Team>) => setT((d) => ({ ...d, ...p }));

  const save = () => {
    if (!t.name.trim()) return toast('L’equip necessita un nom.', 'error');
    const shortName = (t.shortName.trim() || t.name.replace(/[^A-Za-zÀ-ÿ]/g, '').slice(0, 3)).toUpperCase().slice(0, 3);
    upsertTeam({ ...t, name: t.name.trim(), shortName, presidentName: t.presidentName.trim(), logoUrl: t.logoUrl.trim() });
    toast(isNew ? 'Equip creat amb èxit!' : 'Equip actualitzat amb èxit!');
    onClose();
  };

  return (
    <Modal open onOpenChange={(o) => !o && onClose()} title={isNew ? 'Nou equip' : 'Edita l’equip'} size="lg">
      <div className="grid gap-6 p-5 sm:p-6 md:grid-cols-[auto_1fr]">
        <div className="flex flex-col items-center gap-3">
          <TeamCrest team={{ ...t, name: t.name || 'Previsualització', shortName: t.shortName || t.name.slice(0, 3) || 'EQP' }} size={120} />
          <p className="text-xs text-slate-500">Previsualització de l’escut</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nom" className="sm:col-span-2">
            <input className="input" value={t.name} onChange={(e) => patch({ name: e.target.value })} placeholder="Pardinyes Warriors" />
          </Field>
          <Field label="Sigles (3 lletres)">
            <input className="input uppercase" maxLength={3} value={t.shortName} onChange={(e) => patch({ shortName: e.target.value.toUpperCase() })} placeholder="PAR" />
          </Field>
          <Field label="Categoria">
            <select className="input" value={t.category} onChange={(e) => patch({ category: e.target.value as CategoryId })}>
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="President/a" className="sm:col-span-2">
            <input className="input" value={t.presidentName} onChange={(e) => patch({ presidentName: e.target.value })} />
          </Field>
          <Field label="Lleidalitos (moneda virtual)" hint="Deixa-ho buit si la competició no els fa servir." className="sm:col-span-2">
            <input type="number" min={0} className="input" value={t.lleidalitos ?? ''} onChange={(e) => patch({ lleidalitos: e.target.value === '' ? undefined : Math.max(0, Number(e.target.value) || 0) })} />
          </Field>
          <Field label="Color principal">
            <input type="color" className="h-11 w-full cursor-pointer rounded-xl border border-white/10 bg-pitch/70 p-1" value={t.primaryColor} onChange={(e) => patch({ primaryColor: e.target.value })} />
          </Field>
          <Field label="Color secundari">
            <input type="color" className="h-11 w-full cursor-pointer rounded-xl border border-white/10 bg-pitch/70 p-1" value={t.secondaryColor} onChange={(e) => patch({ secondaryColor: e.target.value })} />
          </Field>
          <Field label="URL de l’escut (opcional)" hint="Deixa-ho buit per usar l’escut generat amb els colors de l’equip." className="sm:col-span-2">
            <input className="input" value={t.logoUrl} onChange={(e) => patch({ logoUrl: e.target.value })} placeholder="https://…/escudo.png" />
          </Field>
          <Field label="Història" className="sm:col-span-2">
            <textarea className="input min-h-[96px]" value={t.history} onChange={(e) => patch({ history: e.target.value })} />
          </Field>
        </div>
      </div>
      <div className="flex justify-end gap-3 border-t border-white/10 p-5">
        <button className="btn-ghost" onClick={onClose}>
          Cancel·la
        </button>
        <button className="btn-gold" onClick={save}>
          <Save size={16} /> Desa l’equip
        </button>
      </div>
    </Modal>
  );
}

export function TeamManager() {
  const category = useUiStore((s) => s.category);
  const setCategory = useUiStore((s) => s.setCategory);
  const toast = useUiStore((s) => s.toast);
  const teams = useLeagueStore((s) => s.teams);
  const players = useLeagueStore((s) => s.players);
  const deleteTeam = useLeagueStore((s) => s.deleteTeam);
  const [editing, setEditing] = useState<{ team: Team; isNew: boolean } | null>(null);
  const [removing, setRemoving] = useState<Team | null>(null);

  const list = useMemo(() => teams.filter((t) => t.category === category), [teams, category]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-3">
        <label>
          <span className="label">Categoria</span>
          <select className="input !w-auto" value={category} onChange={(e) => setCategory(e.target.value as CategoryId)}>
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <button className="btn-gold ml-auto" onClick={() => setEditing({ team: blank(category), isNew: true })}>
          <Plus size={16} /> Nou equip
        </button>
      </div>

      <ul className="grid gap-3 md:grid-cols-2">
        {list.map((t) => (
          <li key={t.id} className="card-hover flex items-center gap-4 p-4">
            <TeamCrest team={t} size={52} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-xl font-black uppercase text-white">{t.name}</p>
              <p className="truncate text-xs text-slate-400">
                {t.shortName} · {t.presidentName || 'Sense president'} · {players.filter((p) => p.teamId === t.id).length} jugadors
              </p>
              <div className="mt-1.5 flex gap-1.5">
                <i className="h-3 w-6 rounded-full" style={{ background: t.primaryColor }} />
                <i className="h-3 w-6 rounded-full" style={{ background: t.secondaryColor }} />
              </div>
            </div>
            <button className="btn-ghost !p-2.5" aria-label={`Edita ${t.name}`} onClick={() => setEditing({ team: t, isNew: false })}>
              <Pencil size={15} />
            </button>
            <button className="btn-danger !p-2.5" aria-label={`Elimina ${t.name}`} onClick={() => setRemoving(t)}>
              <Trash2 size={15} />
            </button>
          </li>
        ))}
        {list.length === 0 && <li className="card col-span-full py-12 text-center text-slate-400">Aquesta categoria encara no té equips.</li>}
      </ul>

      {editing && <TeamEditor key={editing.team.id} initial={editing.team} isNew={editing.isNew} onClose={() => setEditing(null)} />}

      <ConfirmDialog
        open={!!removing}
        title="Elimina l’equip"
        message={`S’eliminarà ${removing?.name ?? 'l’equip'} juntament amb els seus jugadors i tots els seus partits. La classificació es recalcularà. Aquesta acció no es pot desfer (tret que restauris una còpia de seguretat).`}
        confirmLabel="Elimina l’equip"
        onCancel={() => setRemoving(null)}
        onConfirm={() => {
          if (removing) deleteTeam(removing.id);
          setRemoving(null);
          toast('Equip eliminat.');
        }}
      />
    </div>
  );
}
