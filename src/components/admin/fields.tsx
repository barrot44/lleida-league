import { ChevronDown, Loader2, Minus, Plus, Upload, X } from 'lucide-react';
import { createContext, useContext, useRef, useState, type ReactNode } from 'react';
import { uploadImage, type UploadKind } from '@/lib/upload';
import { useUiStore } from '@/store/useUiStore';
import { cn } from '@/lib/utils';

export function Field({ label, hint, className, children }: { label: string; hint?: string; className?: string; children: ReactNode }) {
  return (
    <label className={cn('block', className)}>
      <span className="label">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    </label>
  );
}

interface ImageInputProps {
  label: string;
  value: string;
  onChange: (url: string) => void;
  kind: UploadKind;
  folder: string;
  hint?: string;
  className?: string;
  placeholder?: string;
}

/** Picture field: pick a file from this device (gallery or camera on a phone) or paste a link. */
export function ImageInput({ label, value, onChange, kind, folder, hint, className, placeholder }: ImageInputProps) {
  const toast = useUiStore((s) => s.toast);
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const inline = value.startsWith('data:');

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      onChange(await uploadImage(file, kind, folder));
      toast('Imatge pujada.', 'success');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'No s’ha pogut pujar la imatge.', 'error');
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className={cn('block', className)}>
      <span className="label">{label}</span>
      <div className="flex gap-2">
        <input
          className="input min-w-0 flex-1"
          value={inline ? '' : value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={inline ? 'Imatge pujada des del dispositiu' : (placeholder ?? 'Enganxa un enllaç o puja una foto →')}
          aria-label={label}
        />
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => void pick(e.target.files?.[0])} />
        <button type="button" className="btn-ghost shrink-0" disabled={busy} onClick={() => fileRef.current?.click()}>
          {busy ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />} {busy ? 'Pujant…' : 'Puja foto'}
        </button>
        {value && (
          <button type="button" className="btn-ghost shrink-0 !px-3" aria-label="Treu la imatge" onClick={() => onChange('')}>
            <X size={16} />
          </button>
        )}
      </div>
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    </div>
  );
}

interface StepperProps {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  label: string;
  big?: boolean;
}

/** Numeric input with +/- buttons — comfortable for live scoreboards on a phone. */
export function Stepper({ value, onChange, min = 0, max = 99, label, big }: StepperProps) {
  const set = (n: number) => onChange(Math.min(max, Math.max(min, Math.round(Number.isFinite(n) ? n : min))));
  return (
    <div className="flex items-center gap-1.5">
      <button type="button" onClick={() => set(value - 1)} aria-label={`${label}: resta`} className="btn-ghost !p-2.5">
        <Minus size={16} />
      </button>
      <input
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={value}
        onChange={(e) => set(Number(e.target.value))}
        aria-label={label}
        className={cn('input !px-2 text-center font-display font-black', big ? '!w-20 !py-3 text-3xl' : '!w-16')}
      />
      <button type="button" onClick={() => set(value + 1)} aria-label={`${label}: suma`} className="btn-ghost !p-2.5">
        <Plus size={16} />
      </button>
    </div>
  );
}

/** Inside this provider every SectionCard can be folded (the live control room, where screens get long). */
export const SectionFoldContext = createContext<{ isOpen: (title: string) => boolean; toggle: (title: string) => void } | null>(null);

export function SectionCard({ title, actions, children }: { title: string; actions?: ReactNode; children: ReactNode }) {
  const fold = useContext(SectionFoldContext);
  const open = fold ? fold.isOpen(title) : true;
  return (
    <section className={cn('card', fold && !open ? 'px-5 py-3' : 'p-5')}>
      <div className={cn('flex flex-wrap items-center justify-between gap-3', open && 'mb-4')}>
        {fold ? (
          <button type="button" onClick={() => fold.toggle(title)} aria-expanded={open} className="group flex min-w-0 items-center gap-2 text-left">
            <ChevronDown size={18} className={cn('shrink-0 text-slate-500 transition group-hover:text-amber-300', !open && '-rotate-90')} />
            <h3 className="text-xl">{title}</h3>
          </button>
        ) : (
          <h3 className="text-xl">{title}</h3>
        )}
        {open && actions}
      </div>
      {open && children}
    </section>
  );
}
