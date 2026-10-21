import type { FormResult } from '@/lib/standings';
import type { MatchStatus, NewsBadge, Position } from '@/types';
import { cn } from '@/lib/utils';

export function StatusBadge({ status, minute, className }: { status: MatchStatus; minute?: number; className?: string }) {
  if (status === 'live') {
    return (
      <span className={cn('inline-flex items-center gap-1.5 rounded-full border border-red-500/40 bg-red-500/15 px-2.5 py-1 text-[11px] font-black uppercase tracking-widest text-red-300', className)}>
        <span className="h-2 w-2 animate-pulse-live rounded-full bg-red-500 shadow-red" />
        En vivo{minute ? ` · ${minute}'` : ''}
      </span>
    );
  }
  if (status === 'finished') {
    return (
      <span className={cn('inline-flex items-center rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1 text-[11px] font-black uppercase tracking-widest text-emerald-300', className)}>
        Final
      </span>
    );
  }
  return (
    <span className={cn('inline-flex items-center rounded-full border border-cyan-400/30 bg-cyan-400/10 px-2.5 py-1 text-[11px] font-black uppercase tracking-widest text-cyan-300', className)}>
      Próximo
    </span>
  );
}

const FORM_STYLE: Record<FormResult, { label: string; cls: string }> = {
  W: { label: 'V', cls: 'bg-emerald-500 text-emerald-950 shadow-emerald' },
  D: { label: 'E', cls: 'bg-slate-400 text-slate-900' },
  L: { label: 'D', cls: 'bg-red-500 text-red-50 shadow-red' },
};

/** Last results (V-E-D, oldest → newest). */
export function FormDots({ form, size = 'md' }: { form: FormResult[]; size?: 'sm' | 'md' }) {
  if (form.length === 0) return <span className="text-xs text-slate-500">—</span>;
  return (
    <div className="flex items-center gap-1" aria-label={`Racha: ${form.map((f) => FORM_STYLE[f].label).join(' ')}`}>
      {form.map((f, i) => (
        <span
          key={i}
          className={cn('grid place-items-center rounded-md font-display font-black', FORM_STYLE[f].cls, size === 'sm' ? 'h-5 w-5 text-[10px]' : 'h-6 w-6 text-xs')}
        >
          {FORM_STYLE[f].label}
        </span>
      ))}
    </div>
  );
}

const NEWS_STYLE: Record<NewsBadge, string> = {
  Oficial: 'border-amber-400/40 bg-amber-400/10 text-amber-300',
  Mercado: 'border-cyan-400/40 bg-cyan-400/10 text-cyan-300',
  Sanción: 'border-red-400/40 bg-red-400/10 text-red-300',
};

export function NewsBadgeTag({ badge }: { badge: NewsBadge }) {
  return (
    <span className={cn('inline-flex rounded-md border px-2 py-0.5 text-[10px] font-black uppercase tracking-widest', NEWS_STYLE[badge])}>
      {badge}
    </span>
  );
}

const POS_SHORT: Record<Position, string> = { Portero: 'POR', Cierre: 'CIE', Ala: 'ALA', Pívot: 'PIV' };

export function PositionTag({ position, className }: { position: Position; className?: string }) {
  return (
    <span className={cn('inline-flex rounded-md bg-white/[0.07] px-1.5 py-0.5 text-[10px] font-black tracking-widest text-slate-300', className)} title={position}>
      {POS_SHORT[position]}
    </span>
  );
}
