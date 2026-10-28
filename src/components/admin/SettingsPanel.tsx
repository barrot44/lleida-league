import { useRef, useState } from 'react';
import { Cloud, CloudOff, Download, Eraser, KeyRound, RefreshCw, RotateCcw, Trash2, Upload } from 'lucide-react';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Field, SectionCard } from '@/components/admin/fields';
import { downloadRemoteToLocal, publishLocalToRemote } from '@/hooks/useRemoteSync';
import { getAdminPassword, setAdminPassword } from '@/lib/auth';
import { changeAdminPassword, supabaseEnabled } from '@/lib/supabase';
import { downloadTextFile, toISODate } from '@/lib/utils';
import { STORAGE_KEY, useLeagueStore } from '@/store/useLeagueStore';
import { useUiStore, type SyncStatus } from '@/store/useUiStore';

const SYNC_LABEL: Record<SyncStatus, string> = {
  off: 'Desactivada: les dades viuen només en aquest navegador (localStorage).',
  idle: 'Connectada a Supabase. Els canvis s’envien automàticament mentre estàs identificat.',
  syncing: 'Sincronitzant amb Supabase…',
  error: 'Error de connexió amb Supabase. Revisa el .env i les polítiques de la taula.',
  conflict: 'Un altre administrador ha canviat les dades. S’ha carregat l’última versió.',
};

type Confirm = 'reset' | 'blank' | 'clear' | 'publish' | 'download' | null;

export function SettingsPanel() {
  const exportData = useLeagueStore((s) => s.exportData);
  const importData = useLeagueStore((s) => s.importData);
  const resetToSeed = useLeagueStore((s) => s.resetToSeed);
  const startBlankSeason = useLeagueStore((s) => s.startBlankSeason);
  const clearLeague = useLeagueStore((s) => s.clearLeague);
  const counts = {
    teams: useLeagueStore((s) => s.teams.length),
    players: useLeagueStore((s) => s.players.length),
    matches: useLeagueStore((s) => s.matches.length),
    news: useLeagueStore((s) => s.news.length),
    gallery: useLeagueStore((s) => s.gallery.length),
  };
  const [also, setAlso] = useState({ news: false, gallery: false });
  const toast = useUiStore((s) => s.toast);
  const sync = useUiStore((s) => s.syncStatus);
  const email = useUiStore((s) => s.adminEmail);
  const fileRef = useRef<HTMLInputElement>(null);
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [pwd, setPwd] = useState({ current: '', next: '', repeat: '' });

  const kb = (() => {
    try {
      return Math.round(((localStorage.getItem(STORAGE_KEY) ?? '').length * 2) / 1024);
    } catch {
      return 0;
    }
  })();

  const onImport = async (file: File | undefined) => {
    if (!file) return;
    try {
      const json = JSON.parse(await file.text()) as unknown;
      if (importData(json)) toast('Còpia de seguretat restaurada amb èxit!');
      else toast('El fitxer no té el format de dades de la lliga.', 'error');
    } catch {
      toast('No s’ha pogut llegir el fitxer JSON.', 'error');
    }
    if (fileRef.current) fileRef.current.value = '';
  };

  const changePassword = async () => {
    if (pwd.next.length < 6) return toast('La nova contrasenya ha de tenir almenys 6 caràcters.', 'error');
    if (pwd.next !== pwd.repeat) return toast('Les contrasenyes noves no coincideixen.', 'error');
    if (supabaseEnabled) {
      const err = await changeAdminPassword(pwd.next);
      if (err) return toast(`No s’ha pogut canviar la contrasenya: ${err}`, 'error');
    } else {
      if (pwd.current !== getAdminPassword()) return toast('La contrasenya actual no és correcta.', 'error');
      setAdminPassword(pwd.next);
    }
    setPwd({ current: '', next: '', repeat: '' });
    toast('Contrasenya actualitzada.');
  };

  const runConfirm = async () => {
    const action = confirm;
    setConfirm(null);
    if (action === 'reset') {
      resetToSeed();
      toast('Lliga restablerta a les dades originals.', 'info');
    } else if (action === 'blank') {
      startBlankSeason();
      toast('Temporada en blanc: s’han esborrat partits i jugadors d’exemple.', 'info');
    } else if (action === 'clear') {
      // Always a copy first: this cannot be undone otherwise.
      downloadTextFile(`lleida-league-abans-de-buidar-${toISODate(new Date())}.json`, exportData());
      clearLeague(also);
      toast('Lliga buidada. Se t’ha descarregat una còpia del que hi havia.', 'info');
    } else if (action === 'publish') {
      toast((await publishLocalToRemote()) ? 'Dades publicades a Supabase.' : 'No s’ha pogut publicar a Supabase.', 'info');
    } else if (action === 'download') {
      toast((await downloadRemoteToLocal()) ? 'Dades carregades des de Supabase.' : 'No hi ha dades a Supabase o no s’ha pogut connectar.', 'info');
    }
  };

  const CONFIRM_TEXT: Record<Exclude<Confirm, null>, { title: string; message: string; label: string; danger: boolean }> = {
    reset: { title: 'Restableix les dades originals', message: 'Es reemplaçaran totes les dades actuals per les d’exemple (equips, jugadors, partits, galeria, comunicats i club). Et recomanem exportar una còpia abans.', label: 'Sí, restableix', danger: true },
    clear: {
      title: 'Buidar la lliga',
      message: `S’esborraran ${counts.teams} equips, ${counts.players} jugadors i ${counts.matches} partits, i els moviments de Lleidalitos${also.news ? `, els ${counts.news} comunicats` : ''}${also.gallery ? `, les ${counts.gallery} fotos de la galeria` : ''}. Es mantenen el palmarès, els col·laboradors, els àrbitres i els ajustos. Abans d’esborrar es descarregarà una còpia de seguretat.`,
      label: 'Sí, buida-la',
      danger: true,
    },
    blank: { title: 'Començar temporada en blanc', message: 'S’esborraran tots els partits i jugadors, i es mantindran els equips, la galeria, els comunicats i la informació del club. Ideal per començar la temporada real amb els equips reals.', label: 'Esborra partits i jugadors', danger: true },
    publish: { title: 'Publica les dades a Supabase', message: 'Se sobreescriurà la còpia compartida amb les dades d’aquest navegador. Tots els visitants veuran aquestes dades.', label: 'Publica', danger: false },
    download: { title: 'Carrega des de Supabase', message: 'Es descartaran les dades d’aquest navegador i es carregarà la còpia compartida.', label: 'Carrega', danger: true },
  };
  const c = confirm ? CONFIRM_TEXT[confirm] : null;

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <SectionCard title="Còpia de seguretat">
        <p className="mb-4 text-sm text-slate-400">
          Les dades d’aquest navegador ocupen ~{kb} KB. Exporta’n una còpia per no perdre-les o per portar-les a un altre dispositiu.
        </p>
        <div className="flex flex-wrap gap-3">
          <button className="btn-gold" onClick={() => { downloadTextFile(`lleida-league-${toISODate(new Date())}.json`, exportData()); toast('Còpia exportada.'); }}>
            <Download size={16} /> Exporta les dades (JSON)
          </button>
          <button className="btn-ghost" onClick={() => fileRef.current?.click()}>
            <Upload size={16} /> Importa una còpia
          </button>
          <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => void onImport(e.target.files?.[0])} />
        </div>
      </SectionCard>

      <SectionCard title="Dades de la lliga">
        <p className="mb-4 text-sm text-slate-400">Ara hi ha {counts.teams} equips, {counts.players} jugadors i {counts.matches} partits. Per començar de zero, buida la lliga: els equips nous entraran amb les inscripcions dels presidents.</p>
        <div className="mb-4 rounded-2xl border border-red-500/30 bg-red-500/[0.05] p-3">
          <div className="mb-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-300">
            <label className="flex items-center gap-2">
              <input type="checkbox" className="h-4 w-4 accent-amber-400" checked={also.news} onChange={(e) => setAlso((a) => ({ ...a, news: e.target.checked }))} /> També els comunicats ({counts.news})
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" className="h-4 w-4 accent-amber-400" checked={also.gallery} onChange={(e) => setAlso((a) => ({ ...a, gallery: e.target.checked }))} /> També la galeria ({counts.gallery})
            </label>
          </div>
          <button className="btn-danger w-full" onClick={() => setConfirm('clear')}>
            <Trash2 size={16} /> Buida la lliga (equips, jugadors i partits)
          </button>
        </div>
        <div className="flex flex-wrap gap-3">
          <button className="btn-gold" onClick={() => setConfirm('blank')}>
            <Eraser size={16} /> Començar temporada en blanc
          </button>
          <button className="btn-danger" onClick={() => setConfirm('reset')}>
            <RotateCcw size={16} /> Restableix les dades originals
          </button>
        </div>
      </SectionCard>

      <SectionCard title={supabaseEnabled ? 'Compte d’administrador' : 'Contrasenya del tauler'}>
        <div className="grid gap-3">
          {supabaseEnabled ? (
            <p className="text-sm text-slate-300">
              Sessió iniciada com a <strong className="text-white">{email ?? '—'}</strong>.
            </p>
          ) : (
            <Field label="Contrasenya actual">
              <input type="password" autoComplete="current-password" className="input" value={pwd.current} onChange={(e) => setPwd({ ...pwd, current: e.target.value })} />
            </Field>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Nova contrasenya">
              <input type="password" autoComplete="new-password" className="input" value={pwd.next} onChange={(e) => setPwd({ ...pwd, next: e.target.value })} />
            </Field>
            <Field label="Repeteix-la">
              <input type="password" autoComplete="new-password" className="input" value={pwd.repeat} onChange={(e) => setPwd({ ...pwd, repeat: e.target.value })} />
            </Field>
          </div>
          <div>
            <button className="btn-ghost" onClick={() => void changePassword()}>
              <KeyRound size={16} /> Canvia la contrasenya
            </button>
          </div>
          {!supabaseEnabled && <p className="text-xs text-slate-500">És una barrera d’interfície (l’app no té servidor). Per a seguretat real, connecta Supabase: tindràs login amb correu i permisos al servidor.</p>}
        </div>
      </SectionCard>

      <SectionCard title="Sincronització al núvol (Supabase)">
        <div className="flex items-start gap-3 text-sm text-slate-300">
          {sync === 'off' ? <CloudOff className="mt-0.5 shrink-0 text-slate-500" size={20} /> : <Cloud className={`mt-0.5 shrink-0 ${sync === 'error' || sync === 'conflict' ? 'text-red-400' : 'text-cyan-400'}`} size={20} />}
          <p>{SYNC_LABEL[sync]}</p>
        </div>
        {supabaseEnabled ? (
          <div className="mt-4 flex flex-wrap gap-3">
            <button className="btn-ghost" onClick={() => setConfirm('publish')}>
              <Upload size={16} /> Publica les dades d’aquest navegador
            </button>
            <button className="btn-ghost" onClick={() => setConfirm('download')}>
              <RefreshCw size={16} /> Carrega la còpia compartida
            </button>
          </div>
        ) : (
          <p className="mt-3 text-xs text-slate-500">
            Per activar-la copia <code className="rounded bg-white/10 px-1">.env.example</code> a <code className="rounded bg-white/10 px-1">.env.local</code>, executa <code className="rounded bg-white/10 px-1">supabase/schema.sql</code> i omple les variables
            de Supabase. Guia completa al README.
          </p>
        )}
      </SectionCard>

      <ConfirmDialog open={!!c} title={c?.title ?? ''} message={c?.message ?? ''} confirmLabel={c?.label} danger={c?.danger ?? true} onCancel={() => setConfirm(null)} onConfirm={() => void runConfirm()} />
    </div>
  );
}
