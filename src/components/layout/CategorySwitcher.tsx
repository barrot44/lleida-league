import { motion } from 'framer-motion';
import { CATEGORY_BY_ID, SWITCHER_ITEMS } from '@/config/site';
import { useUiStore } from '@/store/useUiStore';
import { cn } from '@/lib/utils';

/**
 * Category tabs. A group (the Junior League) is one tab; when it is selected, its competitions (Infantil, Cadet)
 * appear in a second row so every page (standings, calendar, stats…) shows one of them.
 */
export function CategorySwitcher({ className }: { className?: string }) {
  const category = useUiStore((s) => s.category);
  const setCategory = useUiStore((s) => s.setCategory);
  const current = CATEGORY_BY_ID[category];
  const group = SWITCHER_ITEMS.find((x) => x.kind === 'group' && x.id === current?.group);

  return (
    <div className={cn('flex max-w-full flex-col items-start gap-2', className)}>
      <div role="tablist" aria-label="Categoria" className="glass hide-scrollbar flex max-w-full items-center gap-1 overflow-x-auto rounded-2xl p-1">
        {SWITCHER_ITEMS.map((x) => {
          const id = x.kind === 'category' ? x.meta.id : x.id;
          const active = x.kind === 'category' ? x.meta.id === category : x.members.some((m) => m.id === category);
          const accent = x.kind === 'category' ? x.meta.accent : x.accent;
          const label = x.kind === 'category' ? x.meta.short : x.short;
          return (
            <button
              key={id}
              role="tab"
              aria-selected={active}
              onClick={() => (x.kind === 'category' ? setCategory(x.meta.id) : !active && setCategory(x.members[0].id))}
              className={cn(
                'relative shrink-0 rounded-xl px-4 py-2 font-display text-sm font-black uppercase tracking-wider transition-colors',
                active ? 'text-slate-950' : 'text-slate-400 hover:text-white',
              )}
            >
              {active && (
                <motion.span
                  layoutId="category-pill"
                  className="absolute inset-0 rounded-xl"
                  style={{ background: `linear-gradient(135deg, ${accent}, ${accent}cc)`, boxShadow: `0 0 22px -4px ${accent}` }}
                  transition={{ type: 'spring', damping: 28, stiffness: 380 }}
                />
              )}
              <span className="relative">{label}</span>
            </button>
          );
        })}
      </div>
      {group && group.kind === 'group' && (
        <div role="tablist" aria-label={`Categoria de la ${group.label}`} className="flex items-center gap-1.5 pl-1">
          {group.members.map((m) => {
            const active = m.id === category;
            return (
              <button
                key={m.id}
                role="tab"
                aria-selected={active}
                onClick={() => setCategory(m.id)}
                className={cn(
                  'rounded-full border px-3.5 py-1 font-display text-xs font-black uppercase tracking-wider transition-colors',
                  active ? 'text-slate-950' : 'border-white/10 bg-white/[0.04] text-slate-300 hover:border-white/25 hover:text-white',
                )}
                style={active ? { background: m.accent, borderColor: m.accent } : undefined}
              >
                {m.short}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
