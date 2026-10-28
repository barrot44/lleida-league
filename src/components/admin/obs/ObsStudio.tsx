import { useCallback, useMemo, useState } from 'react';
import { AlertTriangle, Check, ChevronDown, ChevronsDownUp, ChevronsUpDown, Copy, ExternalLink, Eraser, Wifi, WifiOff } from 'lucide-react';
import { OBS_LAYERS, type ObsLayerId } from '@/obs/types';
import { useObsStore, useObsSync } from '@/obs/useObsStore';
import { obsRemoteEnabled } from '@/obs/transport';
import { useUiStore } from '@/store/useUiStore';
import { SectionCard, SectionFoldContext } from '@/components/admin/fields';
import { ObsPreview } from '@/components/admin/obs/ObsPreview';
import { ScoreboardControls } from '@/components/admin/obs/ScoreboardControls';
import { GraphicsControls } from '@/components/admin/obs/GraphicsControls';
import { BrandControls, LowerThirdControls, ScreenControls, TickerControls } from '@/components/admin/obs/ExtrasControls';
import { ObsConnection } from '@/components/admin/obs/ObsConnection';
import { ProductionControls } from '@/components/admin/obs/ProductionControls';
import { MvpPollControls } from '@/components/admin/obs/MvpPollControls';
import { DiceControls } from '@/components/admin/obs/DiceControls';
import { PowerCardsControls } from '@/components/admin/obs/PowerCardsControls';
import { SituationsControls } from '@/components/admin/obs/SituationsControls';
import { MusicControls } from '@/components/admin/obs/MusicControls';
import { InterviewControls } from '@/components/admin/obs/InterviewControls';
import { StatsControls } from '@/components/admin/obs/StatsControls';
import { PredictionControls } from '@/components/admin/obs/PredictionControls';
import { NotifyControls } from '@/components/admin/obs/NotifyControls';
import { VideoControls } from '@/components/admin/obs/VideoControls';
import { useObsActions, useSyncSetting } from '@/components/admin/obs/useObsActions';
import { cn } from '@/lib/utils';

function StatusChip() {
  const { readStatus, readDetail, writeStatus, writeError } = useObsStore();
  if (!obsRemoteEnabled)
    return (
      <span className="flex items-center gap-1.5 rounded-full bg-amber-400/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-amber-300">
        <WifiOff size={13} /> Mode local · només aquest navegador
      </span>
    );
  const bad = writeStatus === 'error' || readStatus === 'error';
  const text = writeStatus === 'error' ? writeError : readStatus === 'error' ? (readDetail === 'missing-table' ? 'Falta la taula «obs_state» a Supabase' : 'Sense connexió') : readStatus === 'realtime' ? 'En temps real' : readStatus === 'polling' ? 'Connectat (cada 2 s)' : 'Connectant…';
  return (
    <span className={cn('flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider', bad ? 'bg-red-500/15 text-red-300' : 'bg-emerald-500/15 text-emerald-300')}>
      {bad ? <AlertTriangle size={13} /> : <Wifi size={13} />} {text}
    </span>
  );
}

function SetupCard({ overlayUrl }: { overlayUrl: string }) {
  const toast = useUiStore((s) => s.toast);
  const streamUrl = useObsStore((s) => s.state.stream.url);
  const update = useObsStore((s) => s.update);
  const [open, setOpen] = useState(false);
  const [layers, setLayers] = useState<ObsLayerId[]>([]);
  const [copied, setCopied] = useState('');
  const url = layers.length ? `${overlayUrl}?capes=${layers.join(',')}` : overlayUrl;

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(text);
      window.setTimeout(() => setCopied(''), 1800);
    } catch {
      toast('No s’ha pogut copiar. Selecciona l’enllaç i copia’l a mà.', 'error');
    }
  };

  return (
    <SectionCard title="La capa per a OBS" actions={<StatusChip />}>
      <div className="flex gap-2">
        <input readOnly className="input font-mono text-xs" value={url} onFocus={(e) => e.target.select()} aria-label="Enllaç de la capa" />
        <button className="btn-gold shrink-0 !px-3" onClick={() => void copy(url)} aria-label="Copia l’enllaç">
          {copied === url ? <Check size={16} /> : <Copy size={16} />}
        </button>
        <a className="btn-ghost shrink-0 !px-3" href={url} target="_blank" rel="noreferrer" aria-label="Obre la capa en una pestanya nova">
          <ExternalLink size={16} />
        </a>
      </div>
      <ol className="mt-4 space-y-1.5 text-sm text-slate-300">
        <li>
          <strong className="text-amber-300">1.</strong> A OBS, a l’escena del partit: <strong>+ → Navegador</strong> (Browser).
        </li>
        <li>
          <strong className="text-amber-300">2.</strong> Enganxa l’enllaç a <strong>URL</strong>, amplada <strong>1920</strong> i alçada <strong>1080</strong>. Accepta.
        </li>
        <li>
          <strong className="text-amber-300">3.</strong> Posa la font a dalt de tot de la llista. Tot el que facis aquí hi apareixerà a l’instant.
        </li>
      </ol>
      <p className="mt-3 text-xs text-slate-500">O connecta OBS més avall i prem «Afegeix la capa a l’escena actual»: ho fa sol.</p>

      <button className="mt-4 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-white" onClick={() => setOpen((o) => !o)}>
        <ChevronDown size={14} className={cn('transition', open && 'rotate-180')} /> Avançat: capes separades
      </button>
      {open && (
        <div className="mt-3 rounded-2xl border border-white/10 bg-pitch/50 p-3">
          <p className="mb-2 text-xs text-slate-400">Si vols posar cada gràfic en una font diferent d’OBS (per ordenar-los o aplicar-hi filtres), tria quines capes ha de dibuixar aquest enllaç:</p>
          <div className="flex flex-wrap gap-1.5">
            {OBS_LAYERS.map((l) => {
              const on = layers.includes(l.id);
              return (
                <button key={l.id} onClick={() => setLayers((ls) => (on ? ls.filter((x) => x !== l.id) : [...ls, l.id]))} className={cn('rounded-lg border px-2.5 py-1 text-xs font-bold transition', on ? 'border-amber-400 bg-amber-400/15 text-amber-200' : 'border-white/10 text-slate-400')}>
                  {l.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
      <div className="mt-5 rounded-2xl border border-red-500/30 bg-red-500/[0.05] p-3">
        <p className="label flex items-center gap-1.5 !text-red-200">🔴 Directe a la web (/directe)</p>
        <input className="input" value={streamUrl} onChange={(e) => update((s) => ({ ...s, stream: { url: e.target.value } }))} placeholder="Enllaç del directe de YouTube, Twitch o TikTok" aria-label="Enllaç del directe" />
        <p className="mt-1.5 text-[11px] text-slate-500">Amb un enllaç de YouTube (vídeo o «live») o Twitch, el vídeo surt dins la web; amb TikTok, surt un botó per obrir-lo. El marcador de la web es mou sol mentre el marcador estigui en antena.</p>
      </div>
      {obsRemoteEnabled && (
        <p className="mt-4 text-xs leading-relaxed text-slate-500">
          Pots portar el control des del mòbil: entra a l’admin, pestanya <strong>Directe</strong>, i els canvis arriben a OBS per internet. També pots afegir aquesta pàgina dins d’OBS a <strong>Acoblables → Acoblables de navegador personalitzats</strong> (Docks → Custom Browser Docks) amb l’adreça <strong>/admin?tab=live</strong>.
        </p>
      )}
    </SectionCard>
  );
}

const FOLD_KEY = 'lleida-league:obs-folded';

/** Which cards of the control room are folded (remembered on this device). */
function useFolded() {
  const [folded, setFolded] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(FOLD_KEY) ?? '[]') as string[];
    } catch {
      return [];
    }
  });
  const save = useCallback((next: string[]) => {
    setFolded(next);
    try {
      localStorage.setItem(FOLD_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }, []);
  const ctx = useMemo(
    () => ({
      isOpen: (title: string) => !folded.includes(title),
      toggle: (title: string) => save(folded.includes(title) ? folded.filter((t) => t !== title) : [...folded, title]),
    }),
    [folded, save],
  );
  return { ctx, foldAll: () => save([...document.querySelectorAll('[data-obs-studio] section.card h3')].map((h) => h.textContent ?? '')), openAll: () => save([]) };
}

/** Control room for the live streams: everything shown in OBS is driven from here. */
export function ObsStudio() {
  useObsSync();
  const [sync, setSync] = useSyncSetting();
  const actions = useObsActions(sync);
  const overlayUrl = useMemo(() => `${window.location.origin}/obs`, []);
  const { ctx, foldAll, openAll } = useFolded();

  return (
    <SectionFoldContext.Provider value={ctx}>
    <div className="space-y-6" data-obs-studio>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.02] px-4 py-3">
        <p className="text-sm text-slate-400">
          Controla els gràfics del directe: marcador, gols animats, alineacions, rètols i pantalles. <span className="text-slate-500">Tot es veu a la vista prèvia tal com sortirà a OBS.</span>
        </p>
        <div className="flex flex-wrap gap-2">
          <button className="btn-ghost !py-2 text-xs" onClick={foldAll}>
            <ChevronsDownUp size={15} /> Plega-ho tot
          </button>
          <button className="btn-ghost !py-2 text-xs" onClick={openAll}>
            <ChevronsUpDown size={15} /> Obre-ho tot
          </button>
          <button className="btn-danger !py-2" onClick={actions.clearAll}>
            <Eraser size={15} /> Neteja la pantalla
          </button>
        </div>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <SetupCard overlayUrl={overlayUrl} />
        <ObsConnection overlayUrl={overlayUrl} />
      </div>

      <ScoreboardControls actions={actions} sync={sync} setSync={setSync} />

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
        <div className="min-w-0 xl:sticky xl:top-24">
          <ObsPreview />
        </div>
        <div className="min-w-0 space-y-6">
          <SituationsControls actions={actions} />
          <VideoControls actions={actions} />
          <MusicControls actions={actions} />
          <StatsControls actions={actions} />
          <PowerCardsControls actions={actions} />
          <DiceControls actions={actions} />
          <ProductionControls actions={actions} />
          <GraphicsControls actions={actions} />
          <PredictionControls actions={actions} />
          <MvpPollControls actions={actions} />
          <InterviewControls actions={actions} />
          <LowerThirdControls actions={actions} />
          <ScreenControls actions={actions} />
          <TickerControls actions={actions} />
          <BrandControls actions={actions} />
          <NotifyControls actions={actions} />
        </div>
      </div>
    </div>
    </SectionFoldContext.Provider>
  );
}
