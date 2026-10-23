import { useState } from 'react';
import { Circle, Clapperboard, Link2, Loader2, MonitorUp, Plug, PlugZap, Radio, RefreshCw, Unplug } from 'lucide-react';
import { useObsLink } from '@/obs/useObsLink';
import { useUiStore } from '@/store/useUiStore';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Field, SectionCard } from '@/components/admin/fields';
import { cn } from '@/lib/utils';

/** Optional direct link to OBS (obs-websocket): switch scenes, go live, record and install the overlay in one click. */
export function ObsConnection({ overlayUrl }: { overlayUrl: string }) {
  const link = useObsLink();
  const toast = useUiStore((s) => s.toast);
  const [url, setUrl] = useState(link.settings.url);
  const [password, setPassword] = useState(link.settings.password);
  const [remember, setRemember] = useState(link.settings.remember);
  const [confirm, setConfirm] = useState<'stream' | 'record' | null>(null);
  const on = link.status === 'on';

  // The overlay gets the OBS address in the URL hash (never sent to any server) so it can drive OBS itself:
  // logo transitions, replays and the plays reel then work from any device, phone included.
  const controlUrl = `${overlayUrl}#obs=${encodeURIComponent(link.settings.url)}&pw=${encodeURIComponent(link.settings.password)}`;

  const install = async () => {
    try {
      toast(await link.installOverlay(controlUrl));
    } catch (e) {
      toast(e instanceof Error ? e.message : 'No s’ha pogut afegir la capa.', 'error');
    }
  };

  const refresh = async () => {
    try {
      toast(await link.refreshOverlay(), 'info');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Error', 'error');
    }
  };

  return (
    <SectionCard
      title="Connexió amb OBS"
      actions={
        <span className={cn('flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-black uppercase tracking-wider', on ? 'bg-emerald-500/15 text-emerald-300' : link.status === 'connecting' ? 'bg-amber-400/15 text-amber-300' : 'bg-white/5 text-slate-400')}>
          <Circle size={8} className={on ? 'fill-emerald-400 text-emerald-400' : 'fill-current'} />
          {on ? `Connectat${link.version ? ` · v${link.version}` : ''}` : link.status === 'connecting' ? 'Connectant…' : 'Desconnectat'}
        </span>
      }
    >
      {!on ? (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            void link.connect({ url, password, remember });
          }}
        >
          <p className="text-xs leading-relaxed text-slate-400">
            Opcional. Des d’aquest ordinador (el mateix on tens OBS obert) pots canviar d’escena, començar l’emissió i afegir la capa sense tocar OBS. A OBS: <strong className="text-slate-200">Eines → Configuració del servidor WebSocket</strong> (Tools → WebSocket Server Settings) → activa’l i copia’n la contrasenya amb «Mostra la informació de connexió».
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Adreça">
              <input className="input" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="ws://localhost:4455" autoComplete="off" />
            </Field>
            <Field label="Contrasenya del WebSocket">
              <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="off" />
            </Field>
          </div>
          <label className="flex items-center gap-2 text-xs text-slate-400">
            <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="accent-amber-400" />
            Recorda-la en aquest dispositiu
          </label>
          {link.error && <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">{link.error}</p>}
          <button type="submit" className="btn-gold w-full" disabled={link.status === 'connecting'}>
            {link.status === 'connecting' ? <Loader2 size={16} className="animate-spin" /> : <Plug size={16} />} Connecta amb OBS
          </button>
        </form>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <button className={cn('btn !py-3', link.streaming ? 'bg-red-500 text-white shadow-red hover:bg-red-400' : 'btn-ghost')} disabled={link.busy} onClick={() => (link.streaming ? setConfirm('stream') : void link.toggleStream())}>
              <Radio size={16} /> {link.streaming ? `En directe ${link.streamTime}` : 'Inicia l’emissió'}
            </button>
            <button className={cn('btn !py-3', link.recording ? 'bg-red-500/80 text-white hover:bg-red-400' : 'btn-ghost')} disabled={link.busy} onClick={() => (link.recording ? setConfirm('record') : void link.toggleRecord())}>
              <Circle size={14} className={link.recording ? 'fill-white' : ''} /> {link.recording ? 'Gravant…' : 'Grava'}
            </button>
          </div>

          <div>
            <p className="label flex items-center gap-1.5">
              <Clapperboard size={12} /> Escenes
            </p>
            {link.scenes.length === 0 ? (
              <p className="text-xs text-slate-500">OBS no té escenes.</p>
            ) : (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {link.scenes.map((name) => (
                  <button
                    key={name}
                    onClick={() => void link.setScene(name)}
                    className={cn('truncate rounded-xl border px-3 py-2.5 text-left text-sm font-bold transition', link.currentScene === name ? 'border-red-500 bg-red-500/15 text-white shadow-red' : 'border-white/10 text-slate-300 hover:border-amber-400/50')}
                  >
                    {link.currentScene === name && <span className="mr-1.5 inline-block h-2 w-2 animate-pulse-live rounded-full bg-red-500" />}
                    {name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <button className="btn-ghost" disabled={link.busy} onClick={() => void install()}>
              <MonitorUp size={15} /> Afegeix la capa a l’escena actual
            </button>
            <button className="btn-ghost" onClick={() => void refresh()}>
              <RefreshCw size={15} /> Recarrega la capa
            </button>
          </div>
          <p className="text-[11px] leading-relaxed text-slate-500">
            «Afegeix la capa» també li dona el control d’OBS (transicions i repeticions). Si la vas afegir a mà abans, torna-la a afegir amb aquest botó o{' '}
            <button
              className="font-bold text-amber-300 underline-offset-2 hover:underline"
              onClick={() =>
                void navigator.clipboard.writeText(controlUrl).then(
                  () => toast('Enllaç amb control copiat. Enganxa’l a la URL de la font de navegador d’OBS.', 'info'),
                  () => toast('No s’ha pogut copiar.', 'error'),
                )
              }
            >
              copia l’enllaç amb control
            </button>
            .
          </p>
          {link.error && <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">{link.error}</p>}
          <button className="btn-ghost w-full !py-2 text-xs" onClick={link.disconnect}>
            <Unplug size={14} /> Desconnecta
          </button>
        </div>
      )}
      {link.status === 'error' && !on && link.error?.includes('tancada') && (
        <p className="mt-3 flex items-center gap-2 text-xs text-slate-500">
          <PlugZap size={13} /> S’ha perdut la connexió. Torna-hi a connectar quan OBS estigui obert.
        </p>
      )}
      <p className="mt-4 flex items-start gap-2 text-[11px] leading-relaxed text-slate-500">
        <Link2 size={12} className="mt-0.5 shrink-0" /> Funciona amb Chrome o Edge al mateix ordinador que OBS. Des del mòbil pots controlar els gràfics igualment (van per internet); només això d’aquí necessita estar al costat d’OBS.
      </p>

      <ConfirmDialog
        open={confirm !== null}
        title={confirm === 'stream' ? 'Aturar l’emissió?' : 'Aturar la gravació?'}
        message={confirm === 'stream' ? 'El directe s’acabarà per a tothom que l’estigui mirant.' : 'Es tancarà el fitxer de la gravació.'}
        confirmLabel={confirm === 'stream' ? 'Atura l’emissió' : 'Atura la gravació'}
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          const what = confirm;
          setConfirm(null);
          if (what === 'stream') void link.toggleStream();
          else if (what === 'record') void link.toggleRecord();
        }}
      />
    </SectionCard>
  );
}
