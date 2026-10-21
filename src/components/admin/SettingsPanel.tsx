import { useRef, useState } from 'react';
import { Cloud, CloudOff, Download, KeyRound, RotateCcw, Upload } from 'lucide-react';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Field, SectionCard } from '@/components/admin/fields';
import type { SyncStatus } from '@/hooks/useRemoteSync';
import { getAdminPassword, setAdminPassword } from '@/lib/auth';
import { downloadTextFile, toISODate } from '@/lib/utils';
import { STORAGE_KEY, useLeagueStore } from '@/store/useLeagueStore';
import { useUiStore } from '@/store/useUiStore';

const SYNC_LABEL: Record<SyncStatus, string> = {
  off: 'Desactivada — los datos viven solo en este navegador (localStorage).',
  idle: 'Conectada a Supabase. Los cambios se envían automáticamente mientras el panel está desbloqueado.',
  syncing: 'Sincronizando con Supabase…',
  error: 'Error de conexión con Supabase. Revisa tu .env y las políticas de la tabla.',
};

export function SettingsPanel({ sync }: { sync: SyncStatus }) {
  const exportData = useLeagueStore((s) => s.exportData);
  const importData = useLeagueStore((s) => s.importData);
  const resetToSeed = useLeagueStore((s) => s.resetToSeed);
  const toast = useUiStore((s) => s.toast);
  const fileRef = useRef<HTMLInputElement>(null);
  const [confirmReset, setConfirmReset] = useState(false);
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
      if (importData(json)) toast('¡Copia de seguridad restaurada con éxito!');
      else toast('El archivo no tiene el formato de datos de la liga.', 'error');
    } catch {
      toast('No se pudo leer el archivo JSON.', 'error');
    }
    if (fileRef.current) fileRef.current.value = '';
  };

  const changePassword = () => {
    if (pwd.current !== getAdminPassword()) return toast('La contraseña actual no es correcta.', 'error');
    if (pwd.next.length < 6) return toast('La nueva contraseña debe tener al menos 6 caracteres.', 'error');
    if (pwd.next !== pwd.repeat) return toast('Las contraseñas nuevas no coinciden.', 'error');
    setAdminPassword(pwd.next);
    setPwd({ current: '', next: '', repeat: '' });
    toast('Contraseña actualizada.');
  };

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <SectionCard title="Copia de seguridad">
        <p className="mb-4 text-sm text-slate-400">
          Todos los datos se guardan en este navegador (~{kb} KB). Exporta una copia para no perderlos o para llevarlos a otro dispositivo.
        </p>
        <div className="flex flex-wrap gap-3">
          <button className="btn-gold" onClick={() => { downloadTextFile(`lleida-league-${toISODate(new Date())}.json`, exportData()); toast('Copia exportada.'); }}>
            <Download size={16} /> Exportar datos (JSON)
          </button>
          <button className="btn-ghost" onClick={() => fileRef.current?.click()}>
            <Upload size={16} /> Importar copia
          </button>
          <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => void onImport(e.target.files?.[0])} />
        </div>
      </SectionCard>

      <SectionCard title="Restablecer liga">
        <p className="mb-4 text-sm text-slate-400">Vuelve a los datos de demostración originales (equipos, jugadores, partidos, galería y comunicados). Se perderán los cambios actuales.</p>
        <button className="btn-danger" onClick={() => setConfirmReset(true)}>
          <RotateCcw size={16} /> Restablecer datos originales
        </button>
      </SectionCard>

      <SectionCard title="Contraseña del panel">
        <div className="grid gap-3">
          <Field label="Contraseña actual">
            <input type="password" autoComplete="current-password" className="input" value={pwd.current} onChange={(e) => setPwd({ ...pwd, current: e.target.value })} />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Nueva contraseña">
              <input type="password" autoComplete="new-password" className="input" value={pwd.next} onChange={(e) => setPwd({ ...pwd, next: e.target.value })} />
            </Field>
            <Field label="Repetir">
              <input type="password" autoComplete="new-password" className="input" value={pwd.repeat} onChange={(e) => setPwd({ ...pwd, repeat: e.target.value })} />
            </Field>
          </div>
          <div>
            <button className="btn-ghost" onClick={changePassword}>
              <KeyRound size={16} /> Cambiar contraseña
            </button>
          </div>
          <p className="text-xs text-slate-500">Es una barrera de interfaz (la app no tiene servidor). Para seguridad real conecta un backend con autenticación.</p>
        </div>
      </SectionCard>

      <SectionCard title="Sincronización en la nube">
        <div className="flex items-start gap-3 text-sm text-slate-300">
          {sync === 'off' ? <CloudOff className="mt-0.5 shrink-0 text-slate-500" size={20} /> : <Cloud className="mt-0.5 shrink-0 text-cyan-400" size={20} />}
          <p>{SYNC_LABEL[sync]}</p>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Para activarla copia <code className="rounded bg-white/10 px-1">.env.example</code> a <code className="rounded bg-white/10 px-1">.env.local</code>, rellena las variables de Supabase y sigue la guía del README.
        </p>
      </SectionCard>

      <ConfirmDialog
        open={confirmReset}
        title="Restablecer datos originales"
        message="Se reemplazarán todos los datos actuales por los de demostración. ¿Seguro que quieres continuar? Te recomendamos exportar una copia antes."
        confirmLabel="Sí, restablecer"
        onCancel={() => setConfirmReset(false)}
        onConfirm={() => {
          resetToSeed();
          setConfirmReset(false);
          toast('Liga restablecida a los datos originales.', 'info');
        }}
      />
    </div>
  );
}
