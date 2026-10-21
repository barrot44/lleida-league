import { Mail } from 'lucide-react';
import { NAV } from '@/config/nav';
import { SITE } from '@/config/site';
import { hrefFor } from '@/hooks/useHashRoute';
import { Logo } from '@/components/ui/Logo';
import { SOCIAL_ICONS } from '@/components/ui/BrandIcons';

export function Footer() {
  return (
    <footer className="mt-20 border-t border-white/[0.08] bg-black/40 pb-28 pt-12 lg:pb-12">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-3">
            <Logo size={56} />
            <div>
              <p className="neon-gold font-display text-2xl font-black uppercase leading-none">Lleida League</p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Futsal · Since {SITE.since}</p>
            </div>
          </div>
          <p className="mt-4 max-w-sm font-display text-lg font-bold italic text-slate-300">“{SITE.tagline}”</p>
        </div>

        <div>
          <p className="label">Navegación</p>
          <ul className="space-y-2 text-sm">
            {NAV.map((n) => (
              <li key={n.id}>
                <a href={hrefFor(n.id)} className="text-slate-300 transition hover:text-amber-300">
                  {n.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="label">Síguenos</p>
          <div className="flex gap-2">
            {SITE.socials.map((s) => {
              const Icon = SOCIAL_ICONS[s.id];
              return (
                <a
                  key={s.id}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  className="grid h-11 w-11 place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-slate-300 transition hover:-translate-y-0.5 hover:border-amber-400/50 hover:text-amber-300 hover:shadow-glow"
                >
                  <Icon size={20} />
                </a>
              );
            })}
          </div>
          <a href={`mailto:${SITE.email}`} className="mt-4 inline-flex items-center gap-2 text-sm text-slate-300 transition hover:text-amber-300">
            <Mail size={16} /> {SITE.email}
          </a>
        </div>
      </div>
      <div className="mx-auto mt-10 max-w-7xl border-t border-white/[0.06] px-4 pt-6 text-xs text-slate-500 sm:px-6">
        © {new Date().getFullYear()} Lleida League. Los datos de equipos, jugadores y resultados incluidos de serie son de demostración: edítalos desde el panel de administración.
      </div>
    </footer>
  );
}
