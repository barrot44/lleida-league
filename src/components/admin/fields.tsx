import { Minus, Plus } from 'lucide-react';
import type { ReactNode } from 'react';
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

export function SectionCard({ title, actions, children }: { title: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <section className="card p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-xl">{title}</h3>
        {actions}
      </div>
      {children}
    </section>
  );
}
