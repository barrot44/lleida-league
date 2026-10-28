import { useRef, useState } from 'react';
import { ArrowDown, ArrowUp, Check, Clapperboard, Link2, ListChecks, Loader2, Megaphone, Play, Square, Trash2, Upload, Volume1 } from 'lucide-react';
import type { ObsVideoItem } from '@/obs/types';
import { useObsStore } from '@/obs/useObsStore';
import { useUiStore } from '@/store/useUiStore';
import { useNow } from '@/hooks/useNow';
import { SectionCard } from '@/components/admin/fields';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import type { useObsActions } from '@/components/admin/obs/useObsActions';
import { supabaseEnabled } from '@/lib/supabase';
import { MAX_VIDEO_MB, VIDEO_LEAD_MS, deleteVideoFile, fmtSeconds, newVideoItem, readDuration, totalSeconds, uploadVideo, videoPosition } from '@/lib/videos';
import { cn, uid } from '@/lib/utils';

type Actions = ReturnType<typeof useObsActions>;
type Kind = ObsVideoItem['kind'];

const LEVELS = [0.25, 0.5, 0.75, 1];

const titleFromFile = (name: string) => name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim() || 'Vídeo';

/** Full-screen videos for the live (intros, promos) and sponsor ads, played by the overlay inside OBS. */
export function VideoControls({ actions }: { actions: Actions }) {
  const toast = useUiStore((s) => s.toast);
  const videos = useObsStore((s) => s.state.videos);
  const now = useNow(500);
  const fileRef = useRef<HTMLInputElement>(null);
  const [kind, setKind] = useState<Kind>('video');
  const [upload, setUpload] = useState<{ name: string; p: number } | null>(null);
  const [link, setLink] = useState('');
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<ObsVideoItem | null>(null);
  /** Ticked rows, played with «Seleccionats» in the order of the lists. */
  const [picked, setPicked] = useState<string[]>([]);

  const set = (fn: (v: typeof videos) => typeof videos) => actions.update((s) => ({ ...s, videos: fn(s.videos) }));
  const play = (items: ObsVideoItem[]) => set((v) => ({ ...v, playing: { id: uid('play'), at: Date.now() + VIDEO_LEAD_MS, items } }));
  const stop = () => set((v) => ({ ...v, playing: null }));

  const playing = videos.playing;
  const pos = videoPosition(playing, now);
  const onAir = !!playing && (pos !== null || now < playing.at);
  const current = playing && pos ? playing.items[pos.index] : null;
  const total = playing ? totalSeconds(playing.items) : 0;

  const lib = videos.library;
  const ads = lib.filter((v) => v.kind === 'ad');
  const clips = lib.filter((v) => v.kind === 'video');
  const order = [...clips, ...ads];
  const selected = order.filter((v) => picked.includes(v.id));
  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const count = (items: ObsVideoItem[]) => `${items.length} · ${fmtSeconds(totalSeconds(items))}`;

  const addFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    for (const file of Array.from(files)) {
      try {
        setUpload({ name: file.name, p: 0 });
        const seconds = await readDuration(file);
        const url = await uploadVideo(file, (p) => setUpload({ name: file.name, p }));
        const item = newVideoItem(titleFromFile(file.name), url, kind, seconds);
        set((v) => ({ ...v, library: [...v.library, item] }));
        toast(`«${item.title}» afegit (${fmtSeconds(seconds)}).`);
      } catch (e) {
        toast(e instanceof Error ? e.message : 'No s’ha pogut afegir el vídeo.', 'error');
      }
    }
    setUpload(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const addLink = async () => {
    const url = link.trim();
    if (!/^https?:\/\//i.test(url)) return toast('Enganxa un enllaç directe a un fitxer de vídeo (https://…mp4).', 'error');
    setAdding(true);
    try {
      const seconds = await readDuration(url);
      const name = decodeURIComponent(url.split('?')[0].split('/').pop() || 'Vídeo');
      set((v) => ({ ...v, library: [...v.library, newVideoItem(titleFromFile(name), url, kind, seconds)] }));
      setLink('');
      toast('Vídeo afegit.');
    } catch (e) {
      toast(e instanceof Error ? `${e.message} (cal un enllaç directe al fitxer, no una pàgina de YouTube).` : 'No s’ha pogut afegir.', 'error');
    } finally {
      setAdding(false);
    }
  };

  const move = (id: string, dir: -1 | 1) =>
    set((v) => {
      const list = [...v.library];
      const i = list.findIndex((x) => x.id === id);
      // Swap with the nearest item of the same kind, so each list keeps its own order.
      let j = i + dir;
      while (j >= 0 && j < list.length && list[j].kind !== list[i].kind) j += dir;
      if (i < 0 || j < 0 || j >= list.length) return v;
      [list[i], list[j]] = [list[j], list[i]];
      return { ...v, library: list };
    });

  const rename = (id: string, title: string) => set((v) => ({ ...v, library: v.library.map((x) => (x.id === id ? { ...x, title } : x)) }));

  const remove = async (item: ObsVideoItem) => {
    set((v) => ({ ...v, library: v.library.filter((x) => x.id !== item.id) }));
    setPicked((p) => p.filter((x) => x !== item.id));
    try {
      await deleteVideoFile(item.url);
      toast('Vídeo esborrat.', 'info');
    } catch {
      toast('Tret de la llista (el fitxer no s’ha pogut esborrar del servidor).', 'info');
    }
  };

  const row = (item: ObsVideoItem, i: number, list: ObsVideoItem[]) => {
    const live = current?.id === item.id && onAir;
    const on = picked.includes(item.id);
    return (
      <li key={item.id} className={cn('flex items-center gap-2 rounded-2xl border px-3 py-2', live ? 'border-red-500/50 bg-red-500/[0.08]' : on ? 'border-amber-400/50 bg-amber-400/[0.06]' : 'border-white/10 bg-white/[0.03]')}>
        <button
          type="button"
          role="checkbox"
          aria-checked={on}
          aria-label={`Selecciona ${item.title}`}
          onClick={() => toggle(item.id)}
          className={cn('grid h-6 w-6 shrink-0 place-items-center rounded-md border-2 transition', on ? 'border-amber-400 bg-amber-400 text-slate-950' : 'border-white/25 hover:border-amber-300')}
        >
          {on && <Check size={14} strokeWidth={3} />}
        </button>
        {item.kind === 'ad' ? <Megaphone size={16} className="shrink-0 text-amber-300" /> : <Clapperboard size={16} className="shrink-0 text-cyan-300" />}
        <input className="min-w-0 flex-1 bg-transparent text-sm font-bold text-white outline-none focus:text-amber-200" value={item.title} onChange={(e) => rename(item.id, e.target.value)} aria-label="Nom del vídeo" />
        <span className="shrink-0 font-mono text-xs text-slate-400">{fmtSeconds(item.seconds)}</span>
        <button className="btn-ghost !p-1.5" disabled={i === 0} onClick={() => move(item.id, -1)} aria-label={`Puja ${item.title}`}>
          <ArrowUp size={14} />
        </button>
        <button className="btn-ghost !p-1.5" disabled={i === list.length - 1} onClick={() => move(item.id, 1)} aria-label={`Baixa ${item.title}`}>
          <ArrowDown size={14} />
        </button>
        <button className="btn-ghost !p-1.5 hover:!text-red-300" onClick={() => setRemoving(item)} aria-label={`Esborra ${item.title}`}>
          <Trash2 size={14} />
        </button>
        <button className={cn('btn !px-3 !py-1.5 text-xs', live ? 'bg-red-500 text-white' : 'btn-gold')} onClick={() => play([item])}>
          <Play size={13} /> {live ? 'En antena' : 'Emet'}
        </button>
      </li>
    );
  };

  return (
    <SectionCard
      title="Anuncis i vídeos"
      actions={
        onAir ? (
          <button className="btn-danger !py-2" onClick={stop}>
            <Square size={15} /> Atura
          </button>
        ) : undefined
      }
    >
      {onAir && playing && (
        <div className="mb-4 rounded-2xl border border-red-500/40 bg-red-500/[0.07] p-3">
          <p className="flex items-center gap-2 text-sm font-bold text-white">
            <span className="h-2 w-2 animate-pulse-live rounded-full bg-red-500" />
            {current ? current.title : 'Comença…'}
            {playing.items.length > 1 && pos && <span className="text-xs font-semibold text-slate-400">({pos.index + 1} de {playing.items.length})</span>}
          </p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-gradient-to-r from-amber-300 to-amber-500" style={{ width: `${pos ? ((total - pos.left) / Math.max(1, total)) * 100 : 0}%` }} />
          </div>
          <p className="mt-1 text-right font-mono text-xs text-slate-400">queden {fmtSeconds(pos?.left ?? total)}</p>
        </div>
      )}

      {lib.length > 0 && (
        <div className="mb-4 space-y-2">
          <div className="grid gap-2 sm:grid-cols-2">
            <button className="btn-gold" onClick={() => play(order)}>
              <Play size={16} /> Reprodueix-ho tot · {count(order)}
            </button>
            <button className={cn('btn', selected.length ? 'bg-cyan-400 text-slate-950 hover:bg-cyan-300' : 'btn-ghost')} disabled={!selected.length} onClick={() => play(selected)}>
              <ListChecks size={16} /> {selected.length ? `Seleccionats · ${count(selected)}` : 'Marca’n per reproduir-los'}
            </button>
          </div>
          {ads.length > 0 && (
            <button className="btn-ghost w-full !py-2 text-xs" onClick={() => play(ads)}>
              <Megaphone size={14} /> Només la tanda d’anuncis · {count(ads)}
            </button>
          )}
          <div className="flex justify-end gap-3 text-[11px] font-bold uppercase tracking-wider">
            <button className="text-slate-400 hover:text-white" onClick={() => setPicked(order.map((v) => v.id))}>
              Marca’ls tots
            </button>
            <button className="text-slate-400 hover:text-white disabled:opacity-40" disabled={!picked.length} onClick={() => setPicked([])}>
              Desmarca’ls
            </button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <p className="label flex items-center gap-1.5">
            <Clapperboard size={13} /> Vídeos (intro, promos…)
          </p>
          {clips.length ? <ul className="space-y-1.5">{clips.map((v, i) => row(v, i, clips))}</ul> : <p className="text-xs text-slate-500">Encara no n’hi ha cap.</p>}
        </div>
        <div>
          <p className="label flex items-center gap-1.5">
            <Megaphone size={13} /> Anuncis de patrocinadors
          </p>
          {ads.length ? <ul className="space-y-1.5">{ads.map((v, i) => row(v, i, ads))}</ul> : <p className="text-xs text-slate-500">Encara no n’hi ha cap. A la tanda surten tots seguits, en aquest ordre.</p>}
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-white/10 bg-pitch/50 p-3">
        <div className="mb-3 flex gap-1.5">
          {(
            [
              ['video', 'Vídeo', Clapperboard],
              ['ad', 'Anunci de patrocinador', Megaphone],
            ] as const
          ).map(([k, label, Icon]) => (
            <button key={k} onClick={() => setKind(k)} className={cn('flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold transition', kind === k ? 'border-amber-400 bg-amber-400/15 text-amber-200' : 'border-white/10 text-slate-400 hover:text-white')}>
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>
        <input ref={fileRef} type="file" accept="video/mp4,video/webm,video/quicktime" multiple className="hidden" onChange={(e) => void addFiles(e.target.files)} />
        <button
          className="flex w-full flex-col items-center gap-1.5 rounded-2xl border-2 border-dashed border-white/15 px-4 py-6 text-sm text-slate-300 transition hover:border-amber-400/60 hover:text-amber-100 disabled:opacity-60"
          disabled={!!upload}
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            void addFiles(e.dataTransfer.files);
          }}
        >
          {upload ? (
            <>
              <Loader2 size={22} className="animate-spin text-amber-300" />
              <span className="font-bold">Pujant «{upload.name}»… {Math.round(upload.p * 100)}%</span>
              <span className="h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-white/10">
                <span className="block h-full bg-amber-400" style={{ width: `${upload.p * 100}%` }} />
              </span>
            </>
          ) : (
            <>
              <Upload size={22} className="text-amber-300" />
              <span className="font-bold">Puja {kind === 'ad' ? 'un anunci' : 'un vídeo'} (MP4, fins a {MAX_VIDEO_MB} MB)</span>
              <span className="text-xs text-slate-500">Toca per triar-lo o arrossega’l aquí. En pots triar diversos alhora.</span>
            </>
          )}
        </button>
        <div className="mt-3 flex gap-2">
          <input className="input !py-2 text-xs" value={link} onChange={(e) => setLink(e.target.value)} placeholder="O enganxa un enllaç directe a un .mp4" aria-label="Enllaç del vídeo" />
          <button className="btn-ghost shrink-0 !py-2 text-xs" disabled={adding || !link.trim()} onClick={() => void addLink()}>
            {adding ? <Loader2 size={14} className="animate-spin" /> : <Link2 size={14} />} Afegeix
          </button>
        </div>
        {!supabaseEnabled && <p className="mt-2 text-xs text-amber-200">Mode local: el vídeo només funciona en aquest navegador fins que el tanquis.</p>}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
          <Volume1 size={14} /> Volum
        </span>
        {LEVELS.map((v) => (
          <button key={v} onClick={() => set((x) => ({ ...x, volume: v }))} className={cn('rounded-lg border px-2.5 py-1 text-xs font-bold', videos.volume === v ? 'border-amber-400 bg-amber-400/15 text-amber-200' : 'border-white/10 text-slate-400')}>
            {Math.round(v * 100)}%
          </button>
        ))}
      </div>
      <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
        Surten a pantalla completa a la capa d’OBS, per sobre de tot. Perquè el so vagi al directe, a OBS obre les propietats de la font de navegador i marca <strong>«Controla l’àudio mitjançant OBS»</strong>. A la vista prèvia d’aquí es veuen sense so.
      </p>

      <ConfirmDialog
        open={!!removing}
        title="Esborrar aquest vídeo?"
        message={`«${removing?.title ?? ''}» desapareixerà de la llista${removing?.url.includes('/storage/v1/object/public/videos/') ? ' i s’esborrarà el fitxer del servidor' : ''}.`}
        confirmLabel="Esborra’l"
        onCancel={() => setRemoving(null)}
        onConfirm={() => {
          const v = removing;
          setRemoving(null);
          if (v) void remove(v);
        }}
      />
    </SectionCard>
  );
}
