import { motion } from 'framer-motion';
import { CATEGORIES } from '@/config/site';
import { useUiStore } from '@/store/useUiStore';
import { cn } from '@/lib/utils';

export function CategorySwitcher({ className }: { className?: string }) {
  const category = useUiStore((s) => s.category);
  const setCategory = useUiStore((s) => s.setCategory);

  return (
    <div role="tablist" aria-label="Categoría" className={cn('glass hide-scrollbar flex items-center gap-1 overflow-x-auto rounded-2xl p-1', className)}>
      {CATEGORIES.map((c) => {
        const active = c.id === category;
        return (
          <button
            key={c.id}
            role="tab"
            aria-selected={active}
            onClick={() => setCategory(c.id)}
            className={cn(
              'relative shrink-0 rounded-xl px-4 py-2 font-display text-sm font-black uppercase tracking-wider transition-colors',
              active ? 'text-slate-950' : 'text-slate-400 hover:text-white',
            )}
          >
            {active && (
              <motion.span
                layoutId="category-pill"
                className="absolute inset-0 rounded-xl"
                style={{ background: `linear-gradient(135deg, ${c.accent}, ${c.accent}cc)`, boxShadow: `0 0 22px -4px ${c.accent}` }}
                transition={{ type: 'spring', damping: 28, stiffness: 380 }}
              />
            )}
            <span className="relative">{c.short}</span>
          </button>
        );
      })}
    </div>
  );
}
