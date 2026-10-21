import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

/** Page header with neon accent used at the top of every route. */
export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: string; actions?: ReactNode }) {
  return (
    <motion.header
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      className="mb-8 flex flex-wrap items-end justify-between gap-4"
    >
      <div>
        {eyebrow && <p className="mb-2 text-xs font-black uppercase tracking-[0.3em] text-amber-400">{eyebrow}</p>}
        <h1 className="text-4xl sm:text-5xl">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-slate-400">{description}</p>}
      </div>
      {actions}
    </motion.header>
  );
}

export function EmptyState({ icon, title, hint, className }: { icon: ReactNode; title: string; hint?: string; className?: string }) {
  return (
    <div className={cn('card flex flex-col items-center gap-3 px-6 py-14 text-center', className)}>
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-white/[0.05] text-slate-400">{icon}</div>
      <p className="font-display text-xl font-black uppercase text-white">{title}</p>
      {hint && <p className="max-w-sm text-sm text-slate-400">{hint}</p>}
    </div>
  );
}
