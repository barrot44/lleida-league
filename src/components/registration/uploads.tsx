import { useEffect, useRef, useState } from 'react';
import { Camera, Eye, FileText, Loader2, Lock, RefreshCw, Upload, UserRound, X } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { useUiStore } from '@/store/useUiStore';
import { cropPortrait, isPdf, privateUrl, uploadPrivate, uploadPublic, type PresidentSession } from '@/lib/registration';
import { cn } from '@/lib/utils';

function useUpload() {
  const toast = useUiStore((s) => s.toast);
  const [busy, setBusy] = useState(false);
  const run = async (fn: () => Promise<void>, ok?: string) => {
    setBusy(true);
    try {
      await fn();
      if (ok) toast(ok);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'No s’ha pogut pujar.', 'error');
    } finally {
      setBusy(false);
    }
  };
  return { busy, run };
}

/** Public face photo, cropped 3:4 like an ID photo. Everyone will see it (web, streams, social media). */
export function FacePhoto({ value, onChange, session, size = 132 }: { value: string; onChange: (url: string) => void; session: PresidentSession; size?: number }) {
  const ref = useRef<HTMLInputElement>(null);
  const { busy, run } = useUpload();
  const pick = (file: File | undefined) =>
    file &&
    void run(async () => {
      onChange(await uploadPublic(await cropPortrait(file), 'avatar', session));
      if (ref.current) ref.current.value = '';
    });

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={() => ref.current?.click()}
        className="group relative overflow-hidden rounded-2xl border-2 border-dashed border-white/20 bg-pitch/70 transition hover:border-amber-400/70"
        style={{ width: size, height: (size * 4) / 3 }}
        aria-label={value ? 'Canvia la foto de cara' : 'Puja la foto de cara'}
      >
        {value ? (
          <img src={value} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full flex-col items-center justify-center gap-1 text-slate-500">
            <UserRound size={size / 2.4} strokeWidth={1.2} />
            <span className="text-[10px] font-bold uppercase tracking-widest">Foto tipus DNI</span>
          </span>
        )}
        {/* Face guide */}
        <span className="pointer-events-none absolute left-1/2 top-[14%] h-[52%] w-[58%] -translate-x-1/2 rounded-[50%] border border-amber-300/40" />
        <span className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-black/60 py-1 text-[10px] font-bold uppercase tracking-wider text-white opacity-0 transition group-hover:opacity-100">
          <Camera size={12} /> {value ? 'Canvia' : 'Puja'}
        </span>
        {busy && (
          <span className="absolute inset-0 grid place-items-center bg-black/60">
            <Loader2 className="animate-spin text-amber-300" />
          </span>
        )}
      </button>
      <input ref={ref} type="file" accept="image/*" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
    </div>
  );
}

/** Crest / president photo: public picture with a preview. */
export function PublicImage({ value, onChange, session, kind, label, round }: { value: string; onChange: (url: string) => void; session: PresidentSession; kind: 'avatar' | 'logo'; label: string; round?: boolean }) {
  const ref = useRef<HTMLInputElement>(null);
  const { busy, run } = useUpload();
  const pick = (file: File | undefined) =>
    file &&
    void run(async () => {
      onChange(await uploadPublic(kind === 'avatar' ? await cropPortrait(file) : file, kind, session));
      if (ref.current) ref.current.value = '';
    });
  return (
    <div className="flex items-center gap-3">
      <span className={cn('grid h-20 w-20 shrink-0 place-items-center overflow-hidden border border-white/10 bg-pitch/70', round ? 'rounded-full' : 'rounded-2xl')}>
        {value ? <img src={value} alt="" className={cn('h-full w-full', kind === 'logo' ? 'object-contain p-1.5' : 'object-cover object-top')} /> : <Upload className="text-slate-600" />}
      </span>
      <span className="flex flex-col gap-1.5">
        <button type="button" className="btn-ghost !py-2" disabled={busy} onClick={() => ref.current?.click()}>
          {busy ? <Loader2 size={16} className="animate-spin" /> : value ? <RefreshCw size={16} /> : <Upload size={16} />} {value ? 'Canvia' : label}
        </button>
        {value && (
          <button type="button" className="text-left text-xs text-slate-500 hover:text-red-300" onClick={() => onChange('')}>
            Treu la imatge
          </button>
        )}
      </span>
      <input ref={ref} type="file" accept="image/*" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
    </div>
  );
}

/** Private document (ID picture, signed paper): only the president and the organization can open it. */
export function PrivateDoc({ path, onChange, session, label, hint, allowPdf, compact }: { path: string; onChange: (path: string, previous: string) => void; session: PresidentSession; label: string; hint?: string; allowPdf?: boolean; compact?: boolean }) {
  const ref = useRef<HTMLInputElement>(null);
  const { busy, run } = useUpload();
  const [viewing, setViewing] = useState(false);
  const pick = (file: File | undefined) =>
    file &&
    void run(async () => {
      onChange(await uploadPrivate(file, session, 'doc'), path);
      if (ref.current) ref.current.value = '';
    });

  return (
    <div className={cn('rounded-2xl border p-3', path ? 'border-emerald-400/30 bg-emerald-400/[0.06]' : 'border-white/10 bg-white/[0.03]')}>
      <div className="flex flex-wrap items-center gap-2">
        <span className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-xl', path ? 'bg-emerald-400/15 text-emerald-300' : 'bg-white/5 text-slate-400')}>
          <Lock size={16} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold text-white">{label}</span>
          <span className="block text-xs text-slate-400">{path ? 'Pujat · només el veu l’organització' : (hint ?? 'Només el veurà l’organització, mai es publica.')}</span>
        </span>
        <span className="flex gap-1.5">
          {path && (
            <button type="button" className="btn-ghost !px-3 !py-2" onClick={() => setViewing(true)} aria-label={`Mostra: ${label}`}>
              <Eye size={16} />
            </button>
          )}
          <button type="button" className={cn(path ? 'btn-ghost' : 'btn-gold', '!py-2')} disabled={busy} onClick={() => ref.current?.click()}>
            {busy ? <Loader2 size={16} className="animate-spin" /> : path ? <RefreshCw size={16} /> : <Upload size={16} />}
            {!compact && (path ? 'Canvia' : 'Puja la foto')}
          </button>
        </span>
      </div>
      <input ref={ref} type="file" accept={allowPdf ? 'image/*,application/pdf' : 'image/*'} className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
      {viewing && <DocViewer path={path} title={label} onClose={() => setViewing(false)} />}
    </div>
  );
}

/** Opens a private document through a short-lived link. */
export function DocViewer({ path, title, onClose }: { path: string; title: string; onClose: () => void }) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    privateUrl(path)
      .then(setUrl)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'No s’ha pogut obrir.'));
  }, [path]);
  const pdf = isPdf(path);
  return (
    <Modal open onOpenChange={(o) => !o && onClose()} title={title} size="lg">
      <div className="p-4 sm:p-6">
        <p className="mb-3 flex items-center gap-2 text-xs text-slate-400">
          <Lock size={13} className="text-emerald-300" /> Document privat: l’enllaç caduca en 10 minuts.
        </p>
        {error ? (
          <p className="text-sm text-red-300">{error}</p>
        ) : !url ? (
          <Loader2 className="mx-auto animate-spin text-amber-300" />
        ) : pdf ? (
          <a href={url} target="_blank" rel="noreferrer" className="btn-gold w-full">
            <FileText size={16} /> Obre el PDF
          </a>
        ) : (
          <img src={url} alt={title} className="mx-auto max-h-[70vh] rounded-xl" />
        )}
        <button type="button" className="btn-ghost mt-4 w-full" onClick={onClose}>
          <X size={16} /> Tanca
        </button>
      </div>
    </Modal>
  );
}
