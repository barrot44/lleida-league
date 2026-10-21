import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { PartyPopper } from 'lucide-react';
import { PageHeader } from '@/components/ui/Section';
import { PositionChart } from '@/components/standings/PositionChart';
import { StandingsTable } from '@/components/standings/StandingsTable';
import { TeamCrest } from '@/components/ui/TeamCrest';
import { CATEGORY_BY_ID } from '@/config/site';
import { useUiStore } from '@/store/useUiStore';
import { useLeagueView } from '@/hooks/useLeagueView';
import { celebrate } from '@/lib/confetti';

export default function StandingsPage() {
  const category = useUiStore((s) => s.category);
  const view = useLeagueView(category);
  const cat = CATEGORY_BY_ID[category];

  const played = view.catMatches.filter((m) => m.status === 'finished').length;
  const total = view.catMatches.length;
  const seasonOver = total > 0 && played === total;
  const champion = seasonOver ? view.standings[0] : undefined;
  const progress = total ? Math.round((played / total) * 100) : 0;

  const championId = champion?.team.id;
  useEffect(() => {
    if (champion) void celebrate([champion.team.primaryColor, champion.team.secondaryColor], { big: true });
  }, [championId]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <PageHeader
        eyebrow={cat.label}
        title="Classificació"
        description="Taula en directe: 3 punts per victòria, 1 per empat. Es recalcula sola cada cop que es finalitza un partit. Toca un equip per veure’n la plantilla."
        actions={
          <div className="glass min-w-[200px] rounded-2xl px-4 py-3">
            <div className="mb-1.5 flex justify-between text-[11px] font-bold uppercase tracking-widest text-slate-400">
              <span>Temporada</span>
              <span className="text-amber-300">{progress}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/10">
              <motion.div className="h-full rounded-full bg-gold-gradient shadow-glow" initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 0.9, ease: 'easeOut' }} />
            </div>
            <p className="mt-1.5 text-xs text-slate-500">
              {played} de {total} partits disputats
            </p>
          </div>
        }
      />

      {champion && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-6 flex items-center gap-4 rounded-3xl border border-amber-400/50 bg-gradient-to-r from-amber-400/20 via-amber-400/10 to-transparent p-5 shadow-glow-lg"
        >
          <TeamCrest team={champion.team} size={64} />
          <div className="min-w-0 flex-1">
            <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.25em] text-amber-300">
              <PartyPopper size={15} /> Campió de {cat.label}
            </p>
            <p className="truncate font-display text-3xl font-black uppercase text-white">{champion.team.name}</p>
          </div>
          <button className="btn-gold" onClick={() => void celebrate([champion.team.primaryColor, champion.team.secondaryColor], { big: true })}>
            Celebra-ho!
          </button>
        </motion.div>
      )}

      <StandingsTable rows={view.standings} category={cat} />

      <section className="mt-14">
        <h2 className="section-title mb-5">Evolució de la classificació</h2>
        <PositionChart teams={view.catTeams} matches={view.catMatches} category={cat} />
      </section>
    </div>
  );
}
