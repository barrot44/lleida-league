import { motion } from 'framer-motion';
import { Unlock } from 'lucide-react';
import { ADMIN_NAV, NAV, type RouteId } from '@/config/nav';
import { hrefFor } from '@/hooks/useHashRoute';
import { useUiStore } from '@/store/useUiStore';
import { cn } from '@/lib/utils';

/** App-style bottom navigation for phones and small tablets. */
export function MobileNav({ route }: { route: RouteId }) {
  const adminUnlocked = useUiStore((s) => s.adminUnlocked);
  const items = [...NAV, adminUnlocked ? { ...ADMIN_NAV, icon: Unlock } : ADMIN_NAV];

  return (
    <nav
      aria-label="Navegación móvil"
      className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-pitch/90 backdrop-blur-xl lg:hidden"
    >
      <ul className="mx-auto grid max-w-xl grid-cols-6">
        {items.map((item) => {
          const active = route === item.id;
          const Icon = item.icon;
          return (
            <li key={item.id}>
              <a
                href={hrefFor(item.id)}
                aria-current={active ? 'page' : undefined}
                className={cn('relative flex flex-col items-center gap-1 px-1 pb-2.5 pt-3 text-[10px] font-bold uppercase tracking-wide transition-colors', active ? 'text-amber-300' : 'text-slate-400')}
              >
                {active && <motion.span layoutId="mobile-nav-glow" className="absolute inset-x-3 top-0 h-0.5 rounded-full bg-gold-gradient shadow-glow" />}
                <Icon size={21} strokeWidth={active ? 2.5 : 2} />
                {item.short}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
