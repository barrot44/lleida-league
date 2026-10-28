import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  Crown,
  Eye,
  FileSignature,
  KeyRound,
  Loader2,
  Lock,
  MessageSquareWarning,
  Phone,
  RefreshCw,
  Shield,
  Trash2,
  UserPlus,
  UserRound,
  Wand2,
} from 'lucide-react';
import type { CategoryId } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { TeamCrest } from '@/components/ui/TeamCrest';
import { Field, SectionCard } from '@/components/admin/fields';
import { DocViewer } from '@/components/registration/uploads';
import { CATEGORIES, CATEGORY_BY_ID } from '@/config/site';
import { useLeagueStore } from '@/store/useLeagueStore';
import { useUiStore } from '@/store/useUiStore';
import { supabaseEnabled } from '@/lib/supabase';
import { emptyStats } from '@/lib/standings';
import {
  STATUS_LABEL,
  ageOf,
  createPresident,
  deletePrivate,
  deleteRegistration,
  fullName,
  generatePassword,
  listRegistrations,
  playerIssues,
  regIssues,
  setPresidentPassword,
  updateRegistration,
  type RegStatus,
  type Registration,
} from '@/lib/registration';
import { cn, uid } from '@/lib/utils';

const STATUS_TONE: Record<RegStatus, string> = {
  draft: 'border-white/15 bg-white/5 text-slate-300',
  submitted: 'border-sky-400/50 bg-sky-400/15 text-sky-200',
  changes: 'border-amber-400/50 bg-amber-400/15 text-amber-200',
  approved: 'border-emerald-400/50 bg-emerald-400/15 text-emerald-200',
};

const FILTERS: { id: RegStatus | 'all'; label: string }[] = [
  { id: 'all', label: 'Totes' },
  { id: 'submitted', label: 'Per revisar' },
  { id: 'draft', label: 'Omplint-se' },
  { id: 'changes', label: 'A corregir' },
  { id: 'approved', label: 'Aprovades' },
];

const portalUrl = () => `${window.location.origin}/inscripcio`;

const accessMessage = (email: string, password: string) =>
  `Hola! Aquí tens l’accés per inscriure el teu equip a la Lleida League:\n\n🔗 ${portalUrl()}\n📧 ${email}\n🔑 ${password}\n\nHi has de posar l’escut i el nom de l’equip, les teves dades i els jugadors (dorsal, porter o jugador, foto de cara i foto del DNI). El DNI només el veiem nosaltres.`;

/** Presidents' accounts and the team registrations they send: review, ask for changes, approve into the league. */
export function RegistrationManager() {
  const toast = useUiStore((s) => s.toast);
  const [rows, setRows] = useState<Registration[] | null>(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<RegStatus | 'all'>('all');
  const [open, setOpen] = useState<string | null>(null);

  const load = async () => {
    try {
      setRows(await listRegistrations());
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No s’han pogut carregar.');
      setRows([]);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: rows?.length ?? 0 };
    rows?.forEach((r) => (c[r.status] = (c[r.status] ?? 0) + 1));
    return c;
  }, [rows]);

  const shown = (rows ?? []).filter((r) => filter === 'all' || r.status === filter).sort((a, b) => (a.status === 'submitted' ? -1 : 0) - (b.status === 'submitted' ? -1 : 0) || b.updatedAt.localeCompare(a.updatedAt));
  const current = rows?.find((r) => r.email === open) ?? null;

  return (
    <div className="space-y-6">
      <NewPresident onCreated={() => void load()} />

      <SectionCard
        title="Inscripcions dels equips"
        actions={
          <button className="btn-ghost !py-2" onClick={() => void load().then(() => toast('Actualitzat.', 'info'))}>
            <RefreshCw size={16} /> Actualitza
          </button>
        }
      >
        <div className="mb-4 flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button key={f.id} onClick={() => setFilter(f.id)} className={cn('rounded-lg border px-3 py-1.5 text-xs font-bold', filter === f.id ? 'border-amber-400 bg-amber-400/15 text-amber-200' : 'border-white/10 text-slate-400')}>
              {f.label} · {counts[f.id] ?? 0}
            </button>
          ))}
        </div>
        {error && <p className="mb-3 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</p>}
        {rows === null ? (
          <Loader2 className="mx-auto animate-spin text-amber-300" />
        ) : shown.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">Cap inscripció aquí.</p>
        ) : (
          <ul className="space-y-2">
            {shown.map((r) => {
              const t = r.data.team;
              const missing = regIssues(r.data).length;
              return (
                <li key={r.email}>
                  <button onClick={() => setOpen(r.email)} className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-left transition hover:border-amber-400/50">
                    <TeamCrest team={{ name: t.name || '?', shortName: t.shortName || '?', primaryColor: t.primaryColor, secondaryColor: t.secondaryColor, logoUrl: t.logoUrl }} size={44} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-bold text-white">{t.name || 'Equip sense nom'}</span>
                      <span className="block truncate text-xs text-slate-400">
                        {r.email} · {CATEGORY_BY_ID[r.category]?.short ?? r.category} · {r.data.players.length} jugadors
                        {r.status !== 'approved' && missing > 0 && <span className="text-amber-300"> · {missing} coses per completar</span>}
                      </span>
                    </span>
                    <span className={cn('shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide', STATUS_TONE[r.status])}>{STATUS_LABEL[r.status]}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </SectionCard>

      {current && <Review reg={current} onClose={() => setOpen(null)} onChanged={() => void load()} />}
    </div>
  );
}

// ───────────────────────── New president ─────────────────────────

function NewPresident({ onCreated }: { onCreated: () => void }) {
  const toast = useUiStore((s) => s.toast);
  const [email, setEmail] = useState('');
  const [category, setCategory] = useState<CategoryId>('senior');
  const [password, setPassword] = useState(generatePassword);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ email: string; password: string; outcome: 'created' | 'exists' | 'manual' } | null>(null);

  const create = async () => {
    setBusy(true);
    try {
      const outcome = await createPresident(email, password, category);
      setDone({ email: email.trim().toLowerCase(), password, outcome });
      setEmail('');
      setPassword(generatePassword());
      onCreated();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'No s’ha pogut crear.', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SectionCard title="Dona d’alta un president">
      <p className="mb-4 text-sm text-slate-400">
        Cada president té un accés propi i només pot crear <strong className="text-slate-200">un equip</strong>, a la categoria que triïs. Entra a <span className="text-amber-300">{portalUrl()}</span>.
      </p>
      <div className="grid gap-3 md:grid-cols-[1.4fr_1fr_1.2fr_auto] md:items-end">
        <Field label="Correu del president">
          <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="president@gmail.com" autoComplete="off" />
        </Field>
        <Field label="Categoria">
          <select className="input" value={category} onChange={(e) => setCategory(e.target.value as CategoryId)}>
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Contrasenya">
          <span className="flex gap-2">
            <input className="input font-mono" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="off" />
            <button type="button" className="btn-ghost shrink-0 !px-3" aria-label="Genera’n una de nova" onClick={() => setPassword(generatePassword())}>
              <Wand2 size={16} />
            </button>
          </span>
        </Field>
        <button className="btn-gold" disabled={busy || !email.trim()} onClick={() => void create()}>
          {busy ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />} Crea l’accés
        </button>
      </div>

      {done && <AccessCard {...done} onClose={() => setDone(null)} />}
    </SectionCard>
  );
}

function AccessCard({ email, password, outcome, onClose }: { email: string; password: string; outcome: 'created' | 'exists' | 'manual'; onClose: () => void }) {
  const toast = useUiStore((s) => s.toast);
  const text = accessMessage(email, password);
  const copy = () => void navigator.clipboard.writeText(text).then(() => toast('Missatge copiat: enganxa’l al WhatsApp del president.'));
  return (
    <div className="mt-5 rounded-2xl border border-emerald-400/40 bg-emerald-400/[0.07] p-4">
      {outcome === 'created' && <p className="mb-2 flex items-center gap-2 font-bold text-emerald-200"><CheckCircle2 size={18} /> Accés creat. Envia-li aquestes dades:</p>}
      {outcome === 'exists' && (
        <p className="mb-2 flex items-start gap-2 text-sm text-amber-100">
          <AlertTriangle size={18} className="shrink-0" /> Inscripció creada, però aquest correu ja tenia compte: la contrasenya no s’ha canviat. Si cal, fes «Nova contrasenya» des de la seva inscripció.
        </p>
      )}
      {outcome === 'manual' && (
        <div className="mb-3 rounded-xl border border-amber-400/40 bg-amber-400/10 p-3 text-sm text-amber-100">
          <p className="mb-1 flex items-center gap-2 font-bold"><AlertTriangle size={16} /> Inscripció creada. Falta crear-li l’usuari a mà (un minut):</p>
          <ol className="list-inside list-decimal space-y-0.5">
            <li>Supabase → <strong>Authentication</strong> → <strong>Users</strong> → <strong>Add user</strong> → <strong>Create new user</strong>.</li>
            <li>Posa-hi el correu i la contrasenya d’aquí sota i marca <strong>Auto Confirm User</strong>.</li>
          </ol>
          <p className="mt-1 text-xs text-amber-200/80">Per fer-ho automàtic, afegeix SUPABASE_SERVICE_ROLE_KEY a Vercel (mira el README).</p>
        </div>
      )}
      <pre className="whitespace-pre-wrap rounded-xl bg-black/30 p-3 font-sans text-sm text-slate-200">{text}</pre>
      <div className="mt-3 flex flex-wrap gap-2">
        <button className="btn-gold" onClick={copy}>
          <Copy size={16} /> Copia el missatge
        </button>
        <a className="btn-ghost" href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer">
          Envia per WhatsApp
        </a>
        <button className="btn-ghost" onClick={onClose}>
          Fet
        </button>
      </div>
      <p className="mt-2 text-xs text-slate-500">La contrasenya no es guarda enlloc: copia-la ara. Si es perd, en pots posar una de nova.</p>
    </div>
  );
}

// ───────────────────────── Review one registration ─────────────────────────

function Review({ reg, onClose, onChanged }: { reg: Registration; onClose: () => void; onChanged: () => void }) {
  const toast = useUiStore((s) => s.toast);
  const teams = useLeagueStore((s) => s.teams);
  const leaguePlayers = useLeagueStore((s) => s.players);
  const upsertTeam = useLeagueStore((s) => s.upsertTeam);
  const upsertPlayer = useLeagueStore((s) => s.upsertPlayer);
  const deletePlayer = useLeagueStore((s) => s.deletePlayer);
  const [note, setNote] = useState(reg.adminNote);
  const [busy, setBusy] = useState(false);
  const [doc, setDoc] = useState<{ path: string; title: string } | null>(null);
  const [confirm, setConfirm] = useState<'delete' | 'dni' | null>(null);
  const [access, setAccess] = useState<{ password: string; outcome: 'created' | 'manual' } | null>(null);
  const d = reg.data;
  const inLeague = !!reg.teamId && teams.some((t) => t.id === reg.teamId);
  const issues = regIssues(d);
  const players = [...d.players].sort((a, b) => (a.dorsal ?? 999) - (b.dorsal ?? 999));
  const dniLeft = d.players.filter((p) => p.dniPath).length;

  const act = async (fn: () => Promise<void>, ok: string) => {
    setBusy(true);
    try {
      await fn();
      toast(ok);
      onChanged();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'No s’ha pogut fer.', 'error');
    } finally {
      setBusy(false);
    }
  };

  /** Adds (or updates) the team and its players in the league. */
  const approve = () =>
    act(async () => {
      const existing = reg.teamId ? teams.find((t) => t.id === reg.teamId) : undefined;
      const teamId = existing?.id ?? uid('team');
      const shortName = (d.team.shortName || d.team.name.replace(/[^A-Za-zÀ-ÿ]/g, '').slice(0, 3)).toUpperCase().slice(0, 3);
      upsertTeam({
        ...(existing ?? { history: '' }),
        id: teamId,
        name: d.team.name.trim(),
        shortName,
        presidentName: d.president.name.trim(),
        logoUrl: d.team.logoUrl,
        primaryColor: d.team.primaryColor,
        secondaryColor: d.team.secondaryColor,
        category: reg.category,
        history: existing?.history ?? '',
        presidentPhotoUrl: d.president.photoUrl || existing?.presidentPhotoUrl,
      });
      const ids = new Set(d.players.map((p) => p.id));
      d.players.forEach((p) => {
        const old = leaguePlayers.find((x) => x.id === p.id);
        upsertPlayer({
          id: p.id,
          name: fullName(p),
          nickname: p.nickname || undefined,
          dorsal: p.dorsal ?? 0,
          position: p.role === 'porter' ? 'Portero' : 'Ala',
          teamId,
          photoUrl: p.photoUrl,
          stats: old?.stats ?? emptyStats(),
          adjustments: old?.adjustments ?? emptyStats(),
        });
      });
      // Players taken out of the registration leave the team, unless they already played.
      leaguePlayers.filter((x) => x.teamId === teamId && !ids.has(x.id) && !x.stats.matchesPlayed && !x.stats.goals).forEach((x) => deletePlayer(x.id));
      await updateRegistration(reg.email, { status: 'approved', teamId, adminNote: note.trim() });
    }, inLeague ? 'Equip actualitzat a la lliga.' : 'Inscripció aprovada: l’equip ja és a la lliga! 🎉');

  const askChanges = () => {
    if (!note.trim()) return toast('Escriu què ha de corregir.', 'error');
    void act(() => updateRegistration(reg.email, { status: 'changes', adminNote: note.trim() }), 'Inscripció retornada al president.');
  };

  const dropDni = () =>
    act(async () => {
      await deletePrivate(d.players.map((p) => p.dniPath));
      await updateRegistration(reg.email, { data: { ...d, players: d.players.map((p) => (p.dniPath ? { ...p, dniPath: '', dniChecked: true } : p)) } });
    }, 'DNI esborrats. Queda anotat que l’edat està comprovada.');

  const newPassword = () =>
    act(async () => {
      const password = generatePassword();
      const outcome = await setPresidentPassword(reg.email, password);
      setAccess({ password, outcome: outcome === 'ok' ? 'created' : 'manual' });
    }, 'Contrasenya nova preparada.');

  return (
    <Modal open onOpenChange={(o) => !o && onClose()} title={d.team.name || reg.email} size="xl">
      <div className="space-y-6 p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-4">
          <TeamCrest team={{ name: d.team.name || '?', shortName: d.team.shortName || '?', primaryColor: d.team.primaryColor, secondaryColor: d.team.secondaryColor, logoUrl: d.team.logoUrl }} size={72} />
          <div className="min-w-0 flex-1">
            <p className="font-display text-2xl font-black uppercase text-white">{d.team.name || 'Sense nom'} <span className="text-amber-300">{d.team.shortName}</span></p>
            <p className="text-sm text-slate-400">
              {CATEGORY_BY_ID[reg.category]?.label} · {reg.email}
            </p>
          </div>
          <span className={cn('rounded-full border px-3 py-1 text-xs font-bold uppercase', STATUS_TONE[reg.status])}>{STATUS_LABEL[reg.status]}</span>
        </div>

        {issues.length > 0 && (
          <div className="rounded-2xl border border-amber-400/30 bg-amber-400/[0.06] p-3 text-sm text-amber-100">
            <p className="mb-1 font-bold">Li falta:</p>
            <ul className="list-inside list-disc">{issues.map((i) => <li key={i}>{i}</li>)}</ul>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <p className="label">President/a</p>
            <div className="flex items-center gap-3">
              {d.president.photoUrl ? <img src={d.president.photoUrl} alt="" className="h-14 w-14 rounded-full object-cover object-top" /> : <UserRound className="h-14 w-14 rounded-full bg-white/5 p-3 text-slate-500" />}
              <div>
                <p className="font-bold text-white">{d.president.name || '—'}</p>
                {d.president.phone && (
                  <a href={`tel:${d.president.phone.replace(/\s/g, '')}`} className="flex items-center gap-1.5 text-sm text-amber-300">
                    <Phone size={13} /> {d.president.phone}
                  </a>
                )}
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <p className="label">Drets d’imatge signats</p>
            {d.rightsDocs.length ? (
              <div className="flex flex-wrap gap-2">
                {d.rightsDocs.map((path, i) => (
                  <button key={path} className="btn-ghost !py-2" onClick={() => setDoc({ path, title: `Drets d’imatge · full ${i + 1}` })}>
                    <FileSignature size={15} /> Full {i + 1}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-amber-200">Encara no l’ha pujat.</p>
            )}
            <p className="mt-2 text-xs text-slate-500">{d.confirm.rights ? '✓ Ha confirmat que tothom l’ha signat.' : 'No ha confirmat les signatures.'}</p>
          </div>
        </div>

        <div>
          <p className="label">Jugadors ({players.length})</p>
          <div className="overflow-x-auto rounded-2xl border border-white/10">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-white/[0.04] text-left text-[11px] uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-3 py-2">Foto</th>
                  <th className="px-3 py-2">#</th>
                  <th className="px-3 py-2">Nom</th>
                  <th className="px-3 py-2">Rol</th>
                  <th className="px-3 py-2">Naixement</th>
                  <th className="px-3 py-2">DNI</th>
                </tr>
              </thead>
              <tbody>
                {players.map((p) => {
                  const age = ageOf(p.birthDate);
                  const missing = playerIssues(p, d.players);
                  return (
                    <tr key={p.id} className="border-t border-white/5 align-middle">
                      <td className="px-3 py-2">{p.photoUrl ? <img src={p.photoUrl} alt="" className="h-14 w-[42px] rounded-lg object-cover" /> : <span className="text-xs text-amber-300">Falta</span>}</td>
                      <td className="digital px-3 py-2 text-xl text-amber-300">{p.dorsal ?? '–'}</td>
                      <td className="px-3 py-2">
                        <span className="flex items-center gap-1.5 font-bold text-white">
                          {fullName(p) || '—'} {p.captain && <Crown size={13} className="text-amber-300" />}
                        </span>
                        {p.nickname && <span className="text-xs text-slate-400">«{p.nickname}»</span>}
                        {missing.length > 0 && <span className="block text-xs text-amber-300">Falta: {missing.join(', ')}</span>}
                      </td>
                      <td className="px-3 py-2">
                        <span className="flex items-center gap-1 text-xs font-bold uppercase text-slate-300">
                          {p.role === 'porter' ? <Shield size={12} /> : <UserRound size={12} />} {p.role}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        {p.birthDate ? p.birthDate.split('-').reverse().join('/') : '—'}
                        {age !== null && <span className={cn('block text-xs font-bold', age < 18 ? 'text-amber-300' : 'text-slate-400')}>{age} anys{age < 18 ? ' · menor' : ''}</span>}
                      </td>
                      <td className="px-3 py-2">
                        {p.dniPath ? (
                          <button className="btn-ghost !px-2.5 !py-1.5 text-xs" onClick={() => setDoc({ path: p.dniPath, title: `DNI · ${fullName(p)}` })}>
                            <Eye size={14} /> Mira’l
                          </button>
                        ) : p.dniChecked ? (
                          <span className="text-xs text-emerald-300">✓ Comprovat</span>
                        ) : (
                          <span className="text-xs text-amber-300">Falta</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
            <Lock size={12} /> Els DNI i els papers només es poden obrir des d’aquí, amb enllaços que caduquen en 10 minuts.
          </p>
        </div>

        <Field label="Nota per al president" hint="La veu a la seva pàgina. Obligatòria si li demanes canvis.">
          <textarea className="input min-h-[70px] resize-none" value={note} maxLength={400} onChange={(e) => setNote(e.target.value)} placeholder="Ex.: la foto del dorsal 7 està tallada, torna-la a pujar." />
        </Field>

        <div className="flex flex-wrap gap-2">
          <button className="btn bg-emerald-500 text-emerald-950 hover:bg-emerald-400" disabled={busy} onClick={() => void approve()}>
            {busy ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />} {reg.status === 'approved' ? 'Torna a passar-la a la lliga' : 'Aprova i afegeix a la lliga'}
          </button>
          <button className="btn-ghost" disabled={busy} onClick={askChanges}>
            <MessageSquareWarning size={16} /> {reg.status === 'approved' ? 'Torna-la a obrir' : 'Demana canvis'}
          </button>
          {dniLeft > 0 && (
            <button className="btn-ghost" disabled={busy} onClick={() => setConfirm('dni')}>
              <Lock size={16} /> Esborra els DNI ({dniLeft})
            </button>
          )}
          <button className="btn-ghost" disabled={busy} onClick={() => void newPassword()}>
            <KeyRound size={16} /> Nova contrasenya
          </button>
          <button className="btn-danger ml-auto" disabled={busy} onClick={() => setConfirm('delete')}>
            <Trash2 size={16} /> Elimina
          </button>
        </div>
        {reg.status !== 'approved' && issues.length > 0 && <p className="text-xs text-slate-500">Pots aprovar-la igualment encara que falti alguna cosa.</p>}
        {!supabaseEnabled && <p className="text-xs text-amber-200">Mode local: les inscripcions només existeixen en aquest navegador.</p>}

        {access && <AccessCard email={reg.email} password={access.password} outcome={access.outcome} onClose={() => setAccess(null)} />}
      </div>

      {doc && <DocViewer path={doc.path} title={doc.title} onClose={() => setDoc(null)} />}
      <ConfirmDialog
        open={confirm === 'dni'}
        title="Esborrar les fotos dels DNI?"
        message="Fes-ho un cop hagis comprovat les edats. Quedarà anotat que estan comprovades i les fotos s’esborraran per sempre."
        confirmLabel="Esborra-les"
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          setConfirm(null);
          void dropDni();
        }}
      />
      <ConfirmDialog
        open={confirm === 'delete'}
        title="Eliminar aquesta inscripció?"
        message={`S’esborraran la inscripció, els DNI i els papers, i l’accés de ${reg.email}. L’equip que ja estigui a la lliga no es toca.`}
        confirmLabel="Elimina-la"
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          setConfirm(null);
          void act(async () => {
            await deleteRegistration(reg);
            onClose();
          }, 'Inscripció eliminada.');
        }}
      />
    </Modal>
  );
}
