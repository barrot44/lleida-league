import { useEffect, useState } from 'react';
import { Copy, Loader2, RefreshCw, ShieldCheck, UserMinus, UserPlus, Wand2 } from 'lucide-react';
import { Field, SectionCard } from '@/components/admin/fields';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useUiStore } from '@/store/useUiStore';
import { supabaseEnabled } from '@/lib/supabase';
import { addAdmin, listAdmins, removeAdmin, type AdminUser } from '@/lib/admins';
import { generatePassword } from '@/lib/registration';

const adminMessage = (email: string, password: string | null) =>
  `Hola! Ja ets administrador de la Lleida League 🏆\n\n🔗 ${window.location.origin}/admin\n📧 ${email}\n` +
  (password ? `🔑 ${password}\n\nQuan entris, canvia la contrasenya a «Ajustos i còpia».` : '\nEntra amb la contrasenya que ja tens.');

/** Who can enter the control room: each person with their own login, so access can be taken away one by one. */
export function AdminsManager() {
  const toast = useUiStore((s) => s.toast);
  const [admins, setAdmins] = useState<AdminUser[] | null>(null);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState(generatePassword);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [removing, setRemoving] = useState<AdminUser | null>(null);

  const load = async () => {
    try {
      setAdmins(await listAdmins());
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No s’ha pogut carregar.');
      setAdmins([]);
    }
  };

  useEffect(() => {
    if (supabaseEnabled) void load();
  }, []);

  const add = async () => {
    setBusy(true);
    try {
      const mail = email.trim().toLowerCase();
      const res = await addAdmin(mail, password);
      setMessage(adminMessage(mail, res.created ? password : null));
      toast(res.created ? 'Administrador creat.' : 'Aquest compte ja existia: ara també és administrador.');
      setEmail('');
      setPassword(generatePassword());
      void load();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'No s’ha pogut afegir.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (a: AdminUser) => {
    setBusy(true);
    try {
      await removeAdmin(a.email);
      toast(`${a.email} ja no és administrador.`, 'info');
      void load();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'No s’ha pogut treure.', 'error');
    } finally {
      setBusy(false);
    }
  };

  if (!supabaseEnabled) {
    return (
      <SectionCard title="Administradors">
        <p className="text-sm text-slate-400">En mode local només hi ha la contrasenya d’aquest navegador. Amb Supabase, aquí podràs donar accés a més persones.</p>
      </SectionCard>
    );
  }

  return (
    <SectionCard
      title="Administradors"
      actions={
        <button className="btn-ghost !py-2" onClick={() => void load()}>
          <RefreshCw size={16} /> Actualitza
        </button>
      }
    >
      <p className="mb-4 text-sm text-slate-400">Cada persona entra amb el seu correu i la seva contrasenya, i hi poden ser tots alhora. Si algú deixa de col·laborar, li treus l’accés només a ell.</p>

      {error && <p className="mb-3 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</p>}
      {admins === null ? (
        <Loader2 className="mx-auto animate-spin text-amber-300" />
      ) : (
        <ul className="mb-5 space-y-2">
          {admins.map((a) => (
            <li key={a.email} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
              <ShieldCheck size={18} className="shrink-0 text-amber-300" />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-bold text-white">
                  {a.email} {a.me && <span className="ml-1 rounded-md bg-amber-400/15 px-1.5 py-0.5 text-[10px] font-black uppercase text-amber-300">Tu</span>}
                </span>
                <span className="block text-xs text-slate-500">Des del {new Date(a.since).toLocaleDateString('ca-ES')}</span>
              </span>
              {!a.me && admins.length > 1 && (
                <button className="btn-ghost !px-3 !py-2 hover:!text-red-300" disabled={busy} aria-label={`Treu ${a.email}`} onClick={() => setRemoving(a)}>
                  <UserMinus size={16} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="grid gap-3 md:grid-cols-[1.4fr_1.2fr_auto] md:items-end">
        <Field label="Correu del nou administrador">
          <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nom@gmail.com" autoComplete="off" />
        </Field>
        <Field label="Contrasenya (si encara no té compte)">
          <span className="flex gap-2">
            <input className="input font-mono" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="off" />
            <button type="button" className="btn-ghost shrink-0 !px-3" aria-label="Genera’n una de nova" onClick={() => setPassword(generatePassword())}>
              <Wand2 size={16} />
            </button>
          </span>
        </Field>
        <button className="btn-gold" disabled={busy || !email.trim()} onClick={() => void add()}>
          {busy ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />} Afegeix
        </button>
      </div>

      {message && (
        <div className="mt-5 rounded-2xl border border-emerald-400/40 bg-emerald-400/[0.07] p-4">
          <pre className="whitespace-pre-wrap rounded-xl bg-black/30 p-3 font-sans text-sm text-slate-200">{message}</pre>
          <div className="mt-3 flex flex-wrap gap-2">
            <button className="btn-gold" onClick={() => void navigator.clipboard.writeText(message).then(() => toast('Missatge copiat.'))}>
              <Copy size={16} /> Copia el missatge
            </button>
            <a className="btn-ghost" href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noreferrer">
              Envia per WhatsApp
            </a>
            <button className="btn-ghost" onClick={() => setMessage(null)}>
              Fet
            </button>
          </div>
          <p className="mt-2 text-xs text-slate-500">La contrasenya no es guarda enlloc: copia-la ara.</p>
        </div>
      )}

      <ConfirmDialog
        open={!!removing}
        title="Treure aquest administrador?"
        message={`${removing?.email ?? ''} ja no podrà entrar al tauler. El seu compte no s’esborra: li pots tornar a donar accés quan vulguis.`}
        confirmLabel="Treu-li l’accés"
        onCancel={() => setRemoving(null)}
        onConfirm={() => {
          const a = removing;
          setRemoving(null);
          if (a) void remove(a);
        }}
      />
    </SectionCard>
  );
}
