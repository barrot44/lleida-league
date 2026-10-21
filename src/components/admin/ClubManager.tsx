import { useState } from 'react';
import { Pencil, Plus, Save, Trash2, X } from 'lucide-react';
import type { CategoryId, Champion, Referee, Sponsor } from '@/types';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Field, ImageInput, SectionCard } from '@/components/admin/fields';
import { CATEGORIES, CATEGORY_BY_ID } from '@/config/site';
import { useLeagueStore } from '@/store/useLeagueStore';
import { useUiStore } from '@/store/useUiStore';
import { uid } from '@/lib/utils';

type Removal = { kind: 'champion' | 'sponsor' | 'referee'; id: string; label: string } | null;

function useChampionForm() {
  const champions = useLeagueStore((s) => s.champions);
  const upsert = useLeagueStore((s) => s.upsertChampion);
  const toast = useUiStore((s) => s.toast);
  const blank = (): Champion => ({ id: uid('c'), category: 'senior', edition: 1, year: new Date().getFullYear(), team: '' });
  const [form, setForm] = useState<Champion>(blank);
  const [editing, setEditing] = useState(false);
  const patch = (p: Partial<Champion>) => setForm((f) => ({ ...f, ...p }));

  const save = () => {
    if (!form.team.trim()) return toast('Escriu el nom de l’equip campió.', 'error');
    upsert({ ...form, team: form.team.trim() });
    toast(editing ? 'Campió actualitzat.' : 'Campió afegit al palmarès!');
    setForm(blank());
    setEditing(false);
  };

  return { form, patch, save, editing, champions, setForm, setEditing, reset: () => { setForm(blank()); setEditing(false); } };
}

export function ClubManager() {
  const toast = useUiStore((s) => s.toast);
  const champs = useChampionForm();
  const sponsors = useLeagueStore((s) => s.sponsors);
  const referees = useLeagueStore((s) => s.referees);
  const upsertSponsor = useLeagueStore((s) => s.upsertSponsor);
  const upsertReferee = useLeagueStore((s) => s.upsertReferee);
  const deleteChampion = useLeagueStore((s) => s.deleteChampion);
  const deleteSponsor = useLeagueStore((s) => s.deleteSponsor);
  const deleteReferee = useLeagueStore((s) => s.deleteReferee);

  const blankSponsor = (): Sponsor => ({ id: uid('s'), name: '', url: '', logoUrl: '' });
  const blankReferee = (): Referee => ({ id: uid('r'), name: '', role: 'Àrbitre' });
  const [sponsor, setSponsor] = useState<Sponsor>(blankSponsor);
  const [sponsorEditing, setSponsorEditing] = useState(false);
  const [referee, setReferee] = useState<Referee>(blankReferee);
  const [refereeEditing, setRefereeEditing] = useState(false);
  const [removing, setRemoving] = useState<Removal>(null);

  const saveSponsor = () => {
    if (!sponsor.name.trim()) return toast('El col·laborador necessita un nom.', 'error');
    upsertSponsor({ ...sponsor, name: sponsor.name.trim(), url: sponsor.url?.trim() || undefined, logoUrl: sponsor.logoUrl?.trim() || undefined });
    toast(sponsorEditing ? 'Col·laborador actualitzat.' : 'Col·laborador afegit!');
    setSponsor(blankSponsor());
    setSponsorEditing(false);
  };

  const saveReferee = () => {
    if (!referee.name.trim()) return toast('L’àrbitre necessita un nom.', 'error');
    upsertReferee({ ...referee, name: referee.name.trim(), role: referee.role.trim() || 'Àrbitre' });
    toast(refereeEditing ? 'Àrbitre actualitzat.' : 'Àrbitre afegit!');
    setReferee(blankReferee());
    setRefereeEditing(false);
  };

  const confirmRemoval = () => {
    if (!removing) return;
    if (removing.kind === 'champion') deleteChampion(removing.id);
    if (removing.kind === 'sponsor') deleteSponsor(removing.id);
    if (removing.kind === 'referee') deleteReferee(removing.id);
    toast('Element eliminat.');
    setRemoving(null);
  };

  const iconBtn = 'btn-ghost !p-2.5';

  return (
    <div className="space-y-6">
      <SectionCard
        title="Palmarès (Historial de campions)"
        actions={champs.editing && <button className="btn-ghost !py-1.5 text-xs" onClick={champs.reset}><X size={14} /> Cancel·la l’edició</button>}
      >
        <div className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_110px_110px_1.5fr_auto]">
          <Field label="Competició">
            <select className="input" value={champs.form.category} onChange={(e) => champs.patch({ category: e.target.value as CategoryId })}>
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Edició">
            <input type="number" min={1} className="input" value={champs.form.edition} onChange={(e) => champs.patch({ edition: Math.max(1, Number(e.target.value) || 1) })} />
          </Field>
          <Field label="Any">
            <input type="number" min={2000} max={2100} className="input" value={champs.form.year} onChange={(e) => champs.patch({ year: Number(e.target.value) || champs.form.year })} />
          </Field>
          <Field label="Equip campió">
            <input className="input" value={champs.form.team} onChange={(e) => champs.patch({ team: e.target.value })} placeholder="Nom de l’equip" />
          </Field>
          <div className="flex items-end">
            <button className="btn-gold" onClick={champs.save}>
              {champs.editing ? <Save size={16} /> : <Plus size={16} />} {champs.editing ? 'Desa' : 'Afegeix'}
            </button>
          </div>
        </div>
        <ul className="grid gap-2 md:grid-cols-2">
          {[...champs.champions].sort((a, b) => b.year - a.year).map((c) => (
            <li key={c.id} className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.03] px-3 py-2">
              <span className="digital w-14 text-xl text-amber-300">{c.year}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold text-white">{c.team}</p>
                <p className="text-xs text-slate-500">
                  {CATEGORY_BY_ID[c.category].label} · {c.edition}a edició
                </p>
              </div>
              <button className={iconBtn} aria-label={`Edita ${c.team}`} onClick={() => { champs.setForm(c); champs.setEditing(true); }}>
                <Pencil size={14} />
              </button>
              <button className="btn-danger !p-2.5" aria-label={`Elimina ${c.team}`} onClick={() => setRemoving({ kind: 'champion', id: c.id, label: c.team })}>
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      </SectionCard>

      <SectionCard
        title="Col·laboradors oficials"
        actions={sponsorEditing && <button className="btn-ghost !py-1.5 text-xs" onClick={() => { setSponsor(blankSponsor()); setSponsorEditing(false); }}><X size={14} /> Cancel·la l’edició</button>}
      >
        <div className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1.2fr_1.5fr_auto]">
          <Field label="Nom">
            <input className="input" value={sponsor.name} onChange={(e) => setSponsor({ ...sponsor, name: e.target.value })} />
          </Field>
          <Field label="Web (opcional)">
            <input className="input" value={sponsor.url ?? ''} onChange={(e) => setSponsor({ ...sponsor, url: e.target.value })} placeholder="https://…" />
          </Field>
          <ImageInput label="Logo (opcional)" kind="logo" folder="logos" value={sponsor.logoUrl ?? ''} onChange={(logoUrl) => setSponsor({ ...sponsor, logoUrl })} />
          <div className="flex items-end">
            <button className="btn-gold" onClick={saveSponsor}>
              {sponsorEditing ? <Save size={16} /> : <Plus size={16} />} {sponsorEditing ? 'Desa' : 'Afegeix'}
            </button>
          </div>
        </div>
        <ul className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {sponsors.map((s) => (
            <li key={s.id} className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.03] px-3 py-2">
              <div className="grid h-10 w-14 shrink-0 place-items-center overflow-hidden rounded-lg bg-white p-1">
                {s.logoUrl ? <img src={s.logoUrl} alt="" className="max-h-full max-w-full object-contain" loading="lazy" /> : <span className="text-[10px] font-bold text-slate-500">LOGO</span>}
              </div>
              <p className="min-w-0 flex-1 truncate font-bold text-white">{s.name}</p>
              <button className={iconBtn} aria-label={`Edita ${s.name}`} onClick={() => { setSponsor(s); setSponsorEditing(true); }}>
                <Pencil size={14} />
              </button>
              <button className="btn-danger !p-2.5" aria-label={`Elimina ${s.name}`} onClick={() => setRemoving({ kind: 'sponsor', id: s.id, label: s.name })}>
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      </SectionCard>

      <SectionCard
        title="Àrbitres"
        actions={refereeEditing && <button className="btn-ghost !py-1.5 text-xs" onClick={() => { setReferee(blankReferee()); setRefereeEditing(false); }}><X size={14} /> Cancel·la l’edició</button>}
      >
        <div className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_auto]">
          <Field label="Nom">
            <input className="input" value={referee.name} onChange={(e) => setReferee({ ...referee, name: e.target.value })} />
          </Field>
          <Field label="Càrrec">
            <input className="input" value={referee.role} onChange={(e) => setReferee({ ...referee, role: e.target.value })} />
          </Field>
          <div className="flex items-end">
            <button className="btn-gold" onClick={saveReferee}>
              {refereeEditing ? <Save size={16} /> : <Plus size={16} />} {refereeEditing ? 'Desa' : 'Afegeix'}
            </button>
          </div>
        </div>
        <ul className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {referees.map((r) => (
            <li key={r.id} className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.03] px-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold text-white">{r.name}</p>
                <p className="text-xs text-slate-500">{r.role}</p>
              </div>
              <button className={iconBtn} aria-label={`Edita ${r.name}`} onClick={() => { setReferee(r); setRefereeEditing(true); }}>
                <Pencil size={14} />
              </button>
              <button className="btn-danger !p-2.5" aria-label={`Elimina ${r.name}`} onClick={() => setRemoving({ kind: 'referee', id: r.id, label: r.name })}>
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      </SectionCard>

      <ConfirmDialog
        open={!!removing}
        title="Elimina l’element"
        message={`Vols eliminar «${removing?.label ?? ''}»?`}
        confirmLabel="Elimina"
        onCancel={() => setRemoving(null)}
        onConfirm={confirmRemoval}
      />
    </div>
  );
}
