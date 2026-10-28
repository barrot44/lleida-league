import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Crown,
  Eye,
  FileSignature,
  Globe2,
  Loader2,
  Lock,
  LogIn,
  LogOut,
  Pencil,
  Plus,
  Printer,
  Send,
  Shield,
  Trash2,
  Upload,
  UserRound,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/Section';
import { TeamCrest } from '@/components/ui/TeamCrest';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Field } from '@/components/admin/fields';
import { PlayerEditor } from '@/components/registration/PlayerEditor';
import { DocViewer, PublicImage } from '@/components/registration/uploads';
import { CATEGORY_BY_ID, SITE } from '@/config/site';
import { useUiStore } from '@/store/useUiStore';
import {
  MAX_PLAYERS,
  MIN_PLAYERS,
  STATUS_LABEL,
  ageOf,
  deletePrivate,
  fullName,
  loadMine,
  newPlayer,
  playerIssues,
  presidentSession,
  presidentSignIn,
  presidentSignOut,
  regIssues,
  saveMine,
  season,
  uploadPrivate,
  type PresidentSession,
  type RegData,
  type RegPlayer,
  type Registration,
} from '@/lib/registration';
import { RIGHTS_TEXT, rightsDocHtml } from '@/lib/rightsDoc';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/lib/utils';

type Phase = { kind: 'loading' } | { kind: 'login'; note?: string } | { kind: 'ready'; session: PresidentSession; reg: Registration };

export default function RegistrationPage() {
  const [phase, setPhase] = useState<Phase>({ kind: 'loading' });

  const enter = async () => {
    try {
      const session = await presidentSession();
      const reg = session ? await loadMine() : null;
      setPhase(session && reg ? { kind: 'ready', session, reg } : { kind: 'login' });
    } catch (e) {
      setPhase({ kind: 'login', note: e instanceof Error ? e.message : undefined });
    }
  };

  useEffect(() => {
    void enter();
  }, []);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      {phase.kind === 'loading' && <Loader2 className="mx-auto mt-20 animate-spin text-amber-300" size={32} />}
      {phase.kind === 'login' && <Login note={phase.note} onDone={() => void enter()} />}
      {phase.kind === 'ready' && (
        <RegistrationForm
          key={phase.reg.email}
          session={phase.session}
          initial={phase.reg}
          onSignOut={async () => {
            await presidentSignOut();
            setPhase({ kind: 'login' });
          }}
        />
      )}
    </div>
  );
}

// ───────────────────────── Login ─────────────────────────

function Login({ note, onDone }: { note?: string; onDone: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(note ?? '');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    const err = await presidentSignIn(email, password);
    setBusy(false);
    if (err) setError(err);
    else onDone();
  };

  return (
    <>
      <PageHeader eyebrow={`Temporada ${season()}`} title="Inscripció d’equips" description="Espai per als presidents: crea el teu equip, afegeix-hi els jugadors i envia la inscripció a l’organització." />
      <div className="grid gap-6 md:grid-cols-[1fr_1.1fr]">
        <form onSubmit={(e) => void submit(e)} className="card space-y-4 p-6">
          <h2 className="flex items-center gap-2 text-2xl">
            <Crown className="text-amber-400" /> Accés de presidents
          </h2>
          <Field label="Correu">
            <input className="input" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </Field>
          <Field label="Contrasenya">
            <input className="input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </Field>
          {error && <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</p>}
          <button className="btn-gold w-full" disabled={busy}>
            {busy ? <Loader2 size={16} className="animate-spin" /> : <LogIn size={16} />} Entra
          </button>
        </form>
        <div className="card space-y-3 p-6 text-sm text-slate-300">
          <h2 className="text-xl">Com funciona</h2>
          <Steps
            items={[
              <>L’organització et dona un <strong>correu i una contrasenya</strong>. Si no en tens, escriu-nos a <a className="text-amber-300 underline" href={`mailto:${SITE.email}`}>{SITE.email}</a>.</>,
              <>Posa el <strong>nom i l’escut</strong> de l’equip i les teves dades com a president.</>,
              <>Afegeix els <strong>jugadors</strong>: dorsal, porter o jugador, una foto de cara i una foto del DNI.</>,
              <>Imprimeix el paper de <strong>drets d’imatge</strong>, feu-lo signar i puja’n una foto.</>,
              <>Envia-la. La revisem i, quan l’aprovem, el teu equip ja surt a la web.</>,
            ]}
          />
          <p className="flex gap-2 rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.05] p-3 text-xs text-emerald-100">
            <Lock size={14} className="mt-0.5 shrink-0" /> El DNI només el veu l’organització per comprovar l’edat. La foto de cara sí que és pública.
          </p>
        </div>
      </div>
    </>
  );
}

function Steps({ items }: { items: ReactNode[] }) {
  return (
    <ol className="space-y-2.5">
      {items.map((it, i) => (
        <li key={i} className="flex gap-3">
          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-amber-400/15 text-xs font-black text-amber-300">{i + 1}</span>
          <span>{it}</span>
        </li>
      ))}
    </ol>
  );
}

// ───────────────────────── The registration ─────────────────────────

type SaveState = 'saved' | 'saving' | 'error';

function RegistrationForm({ session, initial, onSignOut }: { session: PresidentSession; initial: Registration; onSignOut: () => Promise<void> }) {
  const toast = useUiStore((s) => s.toast);
  const [data, setData] = useState<RegData>(initial.data);
  const [status, setStatus] = useState(initial.status);
  const [save, setSave] = useState<SaveState>('saved');
  const [editing, setEditing] = useState<{ player: RegPlayer; isNew: boolean } | null>(null);
  const [removing, setRemoving] = useState<RegPlayer | null>(null);
  const [sending, setSending] = useState(false);
  const [paper, setPaper] = useState(false);
  const editable = status === 'draft' || status === 'changes';
  const dirty = useRef(false);
  const latest = useRef(data);
  latest.current = data;

  const change = (fn: (d: RegData) => RegData) => {
    dirty.current = true;
    setData(fn);
  };

  const flush = async () => {
    if (!dirty.current) return;
    dirty.current = false;
    setSave('saving');
    try {
      await saveMine(latest.current);
      setSave('saved');
    } catch (e) {
      dirty.current = true;
      setSave('error');
      toast(e instanceof Error ? e.message : 'No s’ha pogut desar.', 'error');
    }
  };

  // Saves by itself a moment after every change.
  useEffect(() => {
    if (!dirty.current || !editable) return;
    const t = window.setTimeout(() => void flush(), 1200);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const issues = regIssues(data);
  const team = data.team;
  const crest = { name: team.name || 'Equip', shortName: team.shortName || 'EQP', primaryColor: team.primaryColor, secondaryColor: team.secondaryColor, logoUrl: team.logoUrl };
  const players = [...data.players].sort((a, b) => (a.dorsal ?? 999) - (b.dorsal ?? 999));

  const setTeam = (p: Partial<RegData['team']>) => change((d) => ({ ...d, team: { ...d.team, ...p } }));
  const setPresident = (p: Partial<RegData['president']>) => change((d) => ({ ...d, president: { ...d.president, ...p } }));

  const send = async () => {
    if (issues.length) return toast('Encara falten coses: mira la llista de sota.', 'error');
    setSending(true);
    try {
      dirty.current = false;
      setStatus(await saveMine(latest.current, true));
      setSave('saved');
      toast('Inscripció enviada! Et direm alguna cosa aviat 🙌');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
      toast(e instanceof Error ? e.message : 'No s’ha pogut enviar.', 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow={`Inscripció · ${CATEGORY_BY_ID[initial.category]?.label ?? initial.category} · ${season()}`}
        title={team.name || 'El teu equip'}
        description={`Sessió iniciada com a ${session.email}.`}
        actions={
          <div className="flex items-center gap-3">
            {editable && (
              <span className={cn('flex items-center gap-1.5 text-xs font-bold', save === 'error' ? 'text-red-300' : 'text-slate-400')}>
                {save === 'saving' ? <Loader2 size={13} className="animate-spin" /> : save === 'error' ? <AlertTriangle size={13} /> : <CheckCircle2 size={13} className="text-emerald-400" />}
                {save === 'saving' ? 'Desant…' : save === 'error' ? 'No s’ha desat' : 'Tot desat'}
              </span>
            )}
            <button className="btn-ghost" onClick={() => void flush().then(onSignOut)}>
              <LogOut size={16} /> Surt
            </button>
          </div>
        }
      />

      <StatusBanner status={status} note={initial.adminNote} />

      <fieldset disabled={!editable} className="space-y-6 disabled:opacity-90">
        {/* 1. Team */}
        <Card n={1} title="L’equip" done={!!team.name.trim() && team.shortName.length >= 2 && !!team.logoUrl}>
          <div className="grid gap-5 md:grid-cols-[auto_1fr]">
            <div className="flex flex-col items-center gap-2">
              <TeamCrest team={crest} size={112} />
              <span className="text-xs text-slate-500">Així es veurà</span>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nom de l’equip" className="sm:col-span-2">
                <input className="input" value={team.name} maxLength={40} onChange={(e) => setTeam({ name: e.target.value })} placeholder="Pardinyes Warriors" />
              </Field>
              <Field label="Sigles (3 lletres)" hint="Surten al marcador del directe.">
                <input className="input font-display text-lg font-black uppercase" maxLength={3} value={team.shortName} onChange={(e) => setTeam({ shortName: e.target.value.toUpperCase().replace(/[^A-ZÀ-Ý0-9]/g, '') })} placeholder="PAR" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Color 1">
                  <input type="color" className="h-11 w-full cursor-pointer rounded-xl border border-white/10 bg-pitch/70 p-1" value={team.primaryColor} onChange={(e) => setTeam({ primaryColor: e.target.value })} />
                </Field>
                <Field label="Color 2">
                  <input type="color" className="h-11 w-full cursor-pointer rounded-xl border border-white/10 bg-pitch/70 p-1" value={team.secondaryColor} onChange={(e) => setTeam({ secondaryColor: e.target.value })} />
                </Field>
              </div>
              <div className="sm:col-span-2">
                <span className="label">Escut</span>
                <PublicImage value={team.logoUrl} onChange={(logoUrl) => setTeam({ logoUrl })} session={session} kind="logo" label="Puja l’escut" />
                <span className="mt-1 block text-xs text-slate-500">Millor un PNG amb fons transparent.</span>
              </div>
            </div>
          </div>
        </Card>

        {/* 2. President */}
        <Card n={2} title="President/a" done={!!data.president.name.trim() && data.president.phone.replace(/\D/g, '').length >= 9}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nom i cognoms">
              <input className="input" value={data.president.name} onChange={(e) => setPresident({ name: e.target.value })} placeholder="Albert Latorre" />
            </Field>
            <Field label="Telèfon" hint="Privat: només per si l’organització t’ha de trucar.">
              <input className="input" type="tel" inputMode="tel" value={data.president.phone} onChange={(e) => setPresident({ phone: e.target.value })} placeholder="600 000 000" />
            </Field>
            <div className="sm:col-span-2">
              <span className="label">Foto del president (opcional)</span>
              <PublicImage value={data.president.photoUrl} onChange={(photoUrl) => setPresident({ photoUrl })} session={session} kind="avatar" label="Puja la foto" round />
              <span className="mt-1 block text-xs text-slate-500">Surt al «Cara a cara de presidents» dels directes.</span>
            </div>
          </div>
        </Card>

        {/* 3. Players */}
        <Card
          n={3}
          title={`Jugadors (${data.players.length})`}
          done={data.players.length >= MIN_PLAYERS && data.players.every((p) => !playerIssues(p, data.players).length) && data.players.some((p) => p.role === 'porter')}
          actions={
            editable && (
              <button className="btn-gold" disabled={data.players.length >= MAX_PLAYERS} onClick={() => setEditing({ player: newPlayer(), isNew: true })}>
                <Plus size={16} /> Afegeix jugador
              </button>
            )
          }
        >
          <p className="mb-4 text-sm text-slate-400">
            Entre {MIN_PLAYERS} i {MAX_PLAYERS} jugadors, amb un porter com a mínim. Per a cadascun: foto de cara (pública) i foto del DNI (privada).
          </p>
          {players.length === 0 ? (
            <button type="button" onClick={() => setEditing({ player: newPlayer(), isNew: true })} className="flex w-full flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-white/10 py-10 text-slate-400 transition hover:border-amber-400/50 hover:text-amber-200">
              <UserRound size={32} />
              <span className="font-bold">Afegeix el primer jugador</span>
            </button>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {players.map((p) => {
                const missing = playerIssues(p, data.players);
                const age = ageOf(p.birthDate);
                return (
                  <li key={p.id} className={cn('flex items-center gap-3 rounded-2xl border p-2.5', missing.length ? 'border-amber-400/30 bg-amber-400/[0.04]' : 'border-white/10 bg-white/[0.03]')}>
                    <span className="relative h-[72px] w-[54px] shrink-0 overflow-hidden rounded-xl border border-white/10 bg-pitch">
                      {p.photoUrl ? <img src={p.photoUrl} alt="" className="h-full w-full object-cover" /> : <UserRound className="m-auto mt-5 text-slate-600" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="digital text-2xl leading-none text-amber-300">{p.dorsal ?? '–'}</span>
                        <span className="truncate font-bold text-white">{fullName(p) || 'Sense nom'}</span>
                        {p.captain && <Crown size={14} className="shrink-0 text-amber-300" />}
                      </span>
                      <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-slate-400">
                        <span className="flex items-center gap-1 font-bold uppercase">
                          {p.role === 'porter' ? <Shield size={12} /> : <UserRound size={12} />} {p.role}
                        </span>
                        {age !== null && <span>{age} anys</span>}
                        {(p.dniPath || p.dniChecked) && (
                          <span className="flex items-center gap-1 text-emerald-300">
                            <Lock size={11} /> DNI
                          </span>
                        )}
                      </span>
                      {missing.length > 0 && <span className="mt-0.5 block truncate text-xs text-amber-200">Falta: {missing.join(', ')}</span>}
                    </span>
                    {editable && (
                      <span className="flex shrink-0 flex-col gap-1">
                        <button type="button" className="btn-ghost !p-2" aria-label={`Edita ${fullName(p)}`} onClick={() => setEditing({ player: p, isNew: false })}>
                          <Pencil size={15} />
                        </button>
                        <button type="button" className="btn-ghost !p-2 hover:!text-red-300" aria-label={`Treu ${fullName(p)}`} onClick={() => setRemoving(p)}>
                          <Trash2 size={15} />
                        </button>
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        {/* 4. Image rights */}
        <Card n={4} title="Drets d’imatge" done={data.rightsDocs.length > 0}>
          <div className="space-y-2 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm leading-relaxed text-slate-300">
            {RIGHTS_TEXT.map((t) => (
              <p key={t}>{t}</p>
            ))}
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <button type="button" className="btn-ghost" onClick={() => setPaper(true)}>
              <Printer size={16} /> 1. Imprimeix el paper (amb els jugadors)
            </button>
            <RightsUpload session={session} onAdd={(path) => change((d) => ({ ...d, rightsDocs: [...d.rightsDocs, path] }))} />
          </div>
          <p className="mt-2 text-xs text-slate-500">Signa cada jugador (i el pare, la mare o el tutor si és menor) i també tu com a president. Si ocupa més d’un full, puja’ls tots.</p>
          {data.rightsDocs.length > 0 && (
            <ul className="mt-4 space-y-2">
              {data.rightsDocs.map((path, i) => (
                <RightsDocRow
                  key={path}
                  path={path}
                  n={i + 1}
                  editable={editable}
                  onRemove={() => {
                    void deletePrivate([path]);
                    change((d) => ({ ...d, rightsDocs: d.rightsDocs.filter((x) => x !== path) }));
                  }}
                />
              ))}
            </ul>
          )}
        </Card>

        {/* What is public */}
        <section className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-3xl border border-sky-400/20 bg-sky-400/[0.05] p-5">
            <p className="mb-2 flex items-center gap-2 font-display text-lg font-black uppercase text-sky-200">
              <Globe2 size={18} /> Ho veurà tothom
            </p>
            <p className="text-sm text-slate-300">Nom i escut de l’equip, nom del president i la seva foto, i de cada jugador: nom (o àlies), dorsal, porter o jugador i la foto de cara.</p>
          </div>
          <div className="rounded-3xl border border-emerald-400/20 bg-emerald-400/[0.05] p-5">
            <p className="mb-2 flex items-center gap-2 font-display text-lg font-black uppercase text-emerald-200">
              <Lock size={18} /> Només l’organització
            </p>
            <p className="text-sm text-slate-300">Les fotos dels DNI, les dates de naixement, el telèfon i el paper de drets d’imatge signat. Els DNI s’esborren un cop comprovada l’edat.</p>
          </div>
        </section>

        {/* 5. Send */}
        {editable && (
          <Card n={5} title="Revisa i envia" done={!issues.length}>
            <div className="space-y-2">
              <Check checked={data.confirm.truth} onChange={(v) => change((d) => ({ ...d, confirm: { ...d.confirm, truth: v } }))}>
                Confirmo que les dades són certes i que tots els jugadors saben que els inscric a la {SITE.name}.
              </Check>
              <Check checked={data.confirm.rights} onChange={(v) => change((d) => ({ ...d, confirm: { ...d.confirm, rights: v } }))}>
                Confirmo que tots els jugadors (i els pares o tutors dels menors) han signat el paper de drets d’imatge.
              </Check>
            </div>
            {issues.length > 0 ? (
              <div className="mt-4 rounded-2xl border border-amber-400/30 bg-amber-400/[0.06] p-4">
                <p className="mb-2 flex items-center gap-2 text-sm font-bold text-amber-200">
                  <ClipboardList size={16} /> Encara falta:
                </p>
                <ul className="list-inside list-disc space-y-0.5 text-sm text-slate-300">
                  {issues.map((i) => (
                    <li key={i}>{i}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="mt-4 flex items-center gap-2 text-sm font-bold text-emerald-300">
                <CheckCircle2 size={16} /> Tot a punt per enviar.
              </p>
            )}
            <button className="btn-gold mt-4 w-full !py-3.5 text-base" disabled={!!issues.length || sending} onClick={() => void send()}>
              {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />} Envia la inscripció
            </button>
            <p className="mt-2 text-center text-xs text-slate-500">Un cop enviada ja no la podràs canviar, si no és que l’organització te la torna per corregir alguna cosa.</p>
          </Card>
        )}
      </fieldset>

      {editing && (
        <PlayerEditor
          initial={editing.player}
          isNew={editing.isNew}
          others={data.players.filter((p) => p.id !== editing.player.id)}
          session={session}
          onClose={() => setEditing(null)}
          onSave={(p) => {
            change((d) => ({
              ...d,
              players: (editing.isNew ? [...d.players, p] : d.players.map((x) => (x.id === p.id ? p : x))).map((x) => (p.captain && x.id !== p.id ? { ...x, captain: false } : x)),
            }));
            setEditing(null);
          }}
        />
      )}
      {paper && <PaperPreview html={rightsDocHtml(data, initial.category)} onClose={() => setPaper(false)} />}
      <ConfirmDialog
        open={!!removing}
        title="Treure aquest jugador?"
        message={`${removing ? fullName(removing) || 'El jugador' : ''} sortirà de la inscripció i s’esborrarà la foto del seu DNI.`}
        confirmLabel="Treu-lo"
        onCancel={() => setRemoving(null)}
        onConfirm={() => {
          const p = removing;
          setRemoving(null);
          if (!p) return;
          if (p.dniPath) void deletePrivate([p.dniPath]);
          change((d) => ({ ...d, players: d.players.filter((x) => x.id !== p.id) }));
        }}
      />
    </>
  );
}

function StatusBanner({ status, note }: { status: Registration['status']; note: string }) {
  const tone = {
    draft: 'border-white/10 bg-white/[0.03] text-slate-300',
    submitted: 'border-sky-400/40 bg-sky-400/10 text-sky-100',
    changes: 'border-amber-400/50 bg-amber-400/10 text-amber-100',
    approved: 'border-emerald-400/50 bg-emerald-400/10 text-emerald-100',
  }[status];
  const text = {
    draft: 'Es desa sola mentre l’omples. Quan ho tinguis tot, envia-la al final de la pàgina.',
    submitted: 'L’hem rebut i l’estem revisant. Mentrestant no es pot modificar.',
    changes: 'L’organització t’ha demanat que corregeixis alguna cosa. Corregeix-la i torna-la a enviar.',
    approved: 'El teu equip ja és a la lliga! Si cal canviar alguna cosa, parla amb l’organització.',
  }[status];
  return (
    <div className={cn('mb-6 rounded-2xl border px-4 py-3', tone)}>
      <p className="font-display text-lg font-black uppercase">{STATUS_LABEL[status]}</p>
      <p className="text-sm">{text}</p>
      {note && (status === 'changes' || status === 'approved') && <p className="mt-2 rounded-xl bg-black/25 px-3 py-2 text-sm">💬 {note}</p>}
    </div>
  );
}

function Card({ n, title, done, actions, children }: { n: number; title: string; done: boolean; actions?: ReactNode; children: ReactNode }) {
  return (
    <section className="card p-5 sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-3 text-2xl">
          <span className={cn('grid h-8 w-8 place-items-center rounded-full text-sm', done ? 'bg-emerald-400 text-emerald-950' : 'bg-white/10 text-slate-300')}>{done ? <CheckCircle2 size={18} /> : n}</span>
          {title}
        </h2>
        {actions}
      </div>
      {children}
    </section>
  );
}

function Check({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: ReactNode }) {
  return (
    <label className="flex cursor-pointer gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm text-slate-300">
      <input type="checkbox" className="mt-0.5 h-4 w-4 shrink-0 accent-amber-400" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{children}</span>
    </label>
  );
}

/** The paper to sign, shown inside the page (no pop-up windows) and printed from its own frame. */
function PaperPreview({ html, onClose }: { html: string; onClose: () => void }) {
  const frame = useRef<HTMLIFrameElement>(null);
  return (
    <Modal open onOpenChange={(o) => !o && onClose()} title="Paper de drets d’imatge" size="xl">
      <div className="space-y-3 p-4 sm:p-6">
        <p className="text-sm text-slate-400">Imprimeix-lo (o desa’l en PDF), feu-lo signar i després puja’n una foto.</p>
        <iframe ref={frame} srcDoc={html} title="Paper de drets d’imatge" className="h-[60vh] w-full rounded-xl bg-white" />
        <div className="flex gap-2">
          <button type="button" className="btn-ghost flex-1" onClick={onClose}>
            Tanca
          </button>
          <button type="button" className="btn-gold flex-1" onClick={() => frame.current?.contentWindow?.print()}>
            <Printer size={16} /> Imprimeix / desa en PDF
          </button>
        </div>
      </div>
    </Modal>
  );
}

function RightsUpload({ session, onAdd }: { session: PresidentSession; onAdd: (path: string) => void }) {
  const toast = useUiStore((s) => s.toast);
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const pick = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    try {
      for (const f of Array.from(files)) onAdd(await uploadPrivate(f, session, 'drets'));
      toast('Paper pujat.');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'No s’ha pogut pujar.', 'error');
    } finally {
      setBusy(false);
      if (ref.current) ref.current.value = '';
    }
  };
  return (
    <>
      <button type="button" className="btn-gold" disabled={busy} onClick={() => ref.current?.click()}>
        {busy ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />} 2. Puja el paper signat
      </button>
      <input ref={ref} type="file" multiple accept="image/*,application/pdf" className="hidden" onChange={(e) => void pick(e.target.files)} />
    </>
  );
}

function RightsDocRow({ path, n, editable, onRemove }: { path: string; n: number; editable: boolean; onRemove: () => void }) {
  const [view, setView] = useState(false);
  return (
    <li className="flex items-center gap-3 rounded-2xl border border-emerald-400/30 bg-emerald-400/[0.06] px-3 py-2">
      <FileSignature size={18} className="shrink-0 text-emerald-300" />
      <span className="flex-1 text-sm font-bold text-white">Paper signat · full {n}</span>
      <button type="button" className="btn-ghost !p-2" aria-label={`Mostra el full ${n}`} onClick={() => setView(true)}>
        <Eye size={15} />
      </button>
      {editable && (
        <button type="button" className="btn-ghost !p-2 hover:!text-red-300" aria-label={`Treu el full ${n}`} onClick={onRemove}>
          <Trash2 size={15} />
        </button>
      )}
      {view && <DocViewer path={path} title={`Drets d’imatge · full ${n}`} onClose={() => setView(false)} />}
    </li>
  );
}
