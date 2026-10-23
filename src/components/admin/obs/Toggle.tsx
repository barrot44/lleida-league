import { cn } from '@/lib/utils';

interface Props {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
  small?: boolean;
}

/** Switch with a label (role="switch" so it reads well with screen readers). */
export function Toggle({ checked, onChange, label, hint, small }: Props) {
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className="group flex items-center gap-2.5 text-left">
      <span className={cn('relative shrink-0 rounded-full transition-colors', small ? 'h-5 w-9' : 'h-6 w-11', checked ? 'bg-amber-400 shadow-glow' : 'bg-white/15')}>
        <span
          className={cn('absolute top-0.5 rounded-full bg-white shadow transition-transform', small ? 'h-4 w-4' : 'h-5 w-5', checked ? (small ? 'translate-x-[18px]' : 'translate-x-[22px]') : 'translate-x-0.5')}
        />
      </span>
      <span className="leading-tight">
        <span className={cn('block font-bold text-slate-200', small ? 'text-xs' : 'text-sm')}>{label}</span>
        {hint && <span className="block text-xs text-slate-500">{hint}</span>}
      </span>
    </button>
  );
}
