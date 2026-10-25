import { Unlock } from 'lucide-react';
import { ADMIN_NAV, NAV, type RouteId } from '@/config/nav';
import { SITE } from '@/config/site';
import { hrefFor } from '@/hooks/useHashRoute';
import { useUiStore } from '@/store/useUiStore';
import { Logo } from '@/components/ui/Logo';
import { Ticker } from '@/components/layout/Ticker';
import { LiveHeaderBadge } from '@/components/live/LiveBadges';
import { cn } from '@/lib/utils';

export function Header({ route }: { route: RouteId }) {
  const adminUnlocked = useUiStore((s) => s.adminUnlocked);
  const AdminIcon = adminUnlocked ? Unlock : ADMIN_NAV.icon;

  return (
    <div className="sticky top-0 z-50">
      <Ticker />
      <header className="border-b border-white/[0.08] bg-pitch/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6">
          <a href={hrefFor('home')} className="group flex shrink-0 items-center gap-3" aria-label="Lleida League — inici">
            <Logo size={44} className="transition-transform duration-300 group-hover:rotate-[-8deg] group-hover:scale-110" />
            <span className="leading-none">
              <span className="neon-gold block font-display text-2xl font-black uppercase tracking-tight">Lleida League</span>
              <span className="mt-1 hidden text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400 sm:block lg:hidden xl:block">{SITE.tagline}</span>
            </span>
          </a>

          <nav className="ml-auto hidden items-center lg:flex" aria-label="Principal">
            {NAV.map((item) => {
              const active = route === item.id;
              return (
                <a
                  key={item.id}
                  href={hrefFor(item.id)}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'relative whitespace-nowrap rounded-xl px-2.5 py-2 font-display text-[14px] font-bold uppercase tracking-wide transition-colors xl:px-3.5 xl:text-[15px]',
                    active ? 'text-amber-300' : 'text-slate-300 hover:text-white',
                  )}
                >
                  <span className="xl:hidden">{item.lgLabel ?? item.label}</span>
                  <span className="hidden xl:inline">{item.label}</span>
                  {active && <span className="absolute inset-x-2.5 -bottom-0.5 h-0.5 rounded-full bg-gold-gradient shadow-glow xl:inset-x-3" />}
                </a>
              );
            })}
          </nav>

          <span className="ml-auto lg:ml-2">
            <LiveHeaderBadge active={route === 'live'} />
          </span>
          <a
            href={hrefFor('admin')}
            className={cn('btn-gold shrink-0', route === 'admin' && 'ring-2 ring-white/40')}
            aria-label={ADMIN_NAV.label}
          >
            <AdminIcon size={16} />
            <span className="hidden sm:inline lg:hidden xl:inline">Admin</span>
          </a>
        </div>
      </header>
    </div>
  );
}
