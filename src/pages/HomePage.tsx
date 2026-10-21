import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { Hero } from '@/components/home/Hero';
import { NewsList } from '@/components/home/NewsList';
import { MatchCard } from '@/components/calendar/MatchCard';
import { SponsorGrid } from '@/components/club/SponsorGrid';
import { StandingsTable } from '@/components/standings/StandingsTable';
import { SmartImage } from '@/components/ui/SmartImage';
import { CATEGORY_BY_ID } from '@/config/site';
import { hrefFor } from '@/hooks/useHashRoute';
import { useLeagueStore } from '@/store/useLeagueStore';
import { useUiStore } from '@/store/useUiStore';
import { useLeagueView } from '@/hooks/useLeagueView';

function SectionHead({ title, to, label }: { title: string; to?: Parameters<typeof hrefFor>[0]; label?: string }) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <h2 className="section-title">{title}</h2>
      {to && (
        <a href={hrefFor(to)} className="group inline-flex items-center gap-1.5 text-sm font-bold uppercase tracking-wide text-amber-300 transition hover:text-amber-200">
          {label} <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" />
        </a>
      )}
    </div>
  );
}

export default function HomePage() {
  const category = useUiStore((s) => s.category);
  const view = useLeagueView(category);
  const news = useLeagueStore((s) => s.news);
  const gallery = useLeagueStore((s) => s.gallery);
  const sponsors = useLeagueStore((s) => s.sponsors);
  const cat = CATEGORY_BY_ID[category];

  const fixtures = useMemo(() => {
    const live = view.catMatches.filter((m) => m.status === 'live');
    const next = view.catMatches.filter((m) => m.status === 'scheduled').slice(0, 4 - live.length);
    return [...live, ...next].slice(0, 4);
  }, [view.catMatches]);

  const latestNews = useMemo(
    () =>
      [...news]
        .filter((n) => !n.category || n.category === category)
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 4),
    [news, category],
  );

  const photos = useMemo(() => [...gallery].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 4), [gallery]);

  return (
    <>
      <Hero />
      <div className="mx-auto max-w-7xl space-y-16 px-4 pt-14 sm:px-6">
        <section>
          <SectionHead title="La jornada" to="calendar" label="Calendari complet" />
          <div className="grid gap-4 md:grid-cols-2">
            {fixtures.map((m, i) => {
              const home = view.teamMap.get(m.homeTeamId);
              const away = view.teamMap.get(m.awayTeamId);
              return home && away ? <MatchCard key={m.id} match={m} home={home} away={away} index={i} /> : null;
            })}
          </div>
        </section>

        <section className="grid gap-10 lg:grid-cols-[1.25fr_1fr]">
          <div className="min-w-0">
            <SectionHead title={`Classificació ${cat.short}`} to="standings" label="Taula completa" />
            <StandingsTable rows={view.standings} category={cat} compact limit={6} />
          </div>
          <div className="min-w-0">
            <SectionHead title="Comunicats" />
            <NewsList items={latestNews} />
          </div>
        </section>

        {sponsors.length > 0 && (
          <section>
            <SectionHead title="Col·laboradors oficials" to="club" label="Descobreix-nos" />
            <SponsorGrid sponsors={sponsors} compact />
          </section>
        )}

        <section>
          <SectionHead title="Galeria" to="gallery" label="Veure-les totes" />
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {photos.map((p, i) => (
              <motion.a
                key={p.id}
                href={hrefFor('gallery')}
                initial={{ opacity: 0, scale: 0.94 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, delay: i * 0.07 }}
                className="group relative aspect-[4/3] overflow-hidden rounded-2xl border border-white/10"
              >
                <SmartImage src={p.imageUrl} alt={p.title} seed={p.id} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                <p className="absolute inset-x-3 bottom-2.5 truncate font-display text-sm font-black uppercase text-white">{p.title}</p>
              </motion.a>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
