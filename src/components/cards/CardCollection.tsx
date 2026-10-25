import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import type { CategoryId } from '@/types';
import { LeagueCard } from '@/components/cards/LeagueCard';
import { EmptyState } from '@/components/ui/Section';
import { editionOf, EDITION_LABEL, EDITION_STYLE, type Edition } from '@/lib/cardArt';
import { playerRating } from '@/lib/standings';
import { useLeagueView } from '@/hooks/useLeagueView';
import { useUiStore } from '@/store/useUiStore';
import { Layers } from 'lucide-react';
import { cn } from '@/lib/utils';

const ORDER: Edition[] = ['pitxitxi', 'mvp', 'llegenda', 'or', 'plata', 'bronze'];

/** Every player of the category as a collectible card. */
export function CardCollection({ category }: { category: CategoryId }) {
  const view = useLeagueView(category);
  const openModal = useUiStore((s) => s.openModal);
  const [teamId, setTeamId] = useState('all');
  const [edition, setEdition] = useState<Edition | 'all'>('all');

  const cards = useMemo(
    () =>
      view.catPlayers
        .map((p) => ({ p, team: view.teamMap.get(p.teamId), edition: editionOf(p, view.catPlayers), rating: playerRating(p) }))
        .sort((a, b) => ORDER.indexOf(a.edition) - ORDER.indexOf(b.edition) || b.rating - a.rating || a.p.name.localeCompare(b.p.name, 'es')),
    [view],
  );
  const counts = useMemo(() => Object.fromEntries(ORDER.map((e) => [e, cards.filter((c) => c.edition === e).length])) as Record<Edition, number>, [cards]);
  const shown = cards.filter((c) => (teamId === 'all' || c.p.teamId === teamId) && (edition === 'all' || c.edition === edition));

  if (cards.length === 0) return <EmptyState icon={<Layers />} title="Encara no hi ha jugadors" hint="Quan hi hagi plantilles, aquí sortiran totes les cartes." />;

  return (
    <div>
      <p className="mb-5 max-w-2xl text-sm text-slate-400">
        Cada jugador té una carta única: l’art del fons, la constel·lació del revers i el número de col·lecció són irrepetibles. L’edició depèn del rendiment i el <strong className="text-orange-300">Pitxitxi</strong> i el <strong className="text-rose-300">MVP</strong> tenen carta especial.
      </p>
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <button onClick={() => setEdition('all')} className={cn('rounded-full border px-3 py-1.5 text-xs font-black uppercase tracking-wider transition', edition === 'all' ? 'border-amber-400 bg-amber-400/15 text-amber-200' : 'border-white/10 text-slate-400')}>
          Totes ({cards.length})
        </button>
        {ORDER.filter((e) => counts[e] > 0).map((e) => (
          <button
            key={e}
            onClick={() => setEdition(e)}
            className={cn('rounded-full border px-3 py-1.5 text-xs font-black uppercase tracking-wider transition', edition === e ? 'border-transparent text-slate-950' : 'border-white/10 text-slate-300')}
            style={edition === e ? { background: EDITION_STYLE[e].frame } : undefined}
          >
            {EDITION_LABEL[e]} ({counts[e]})
          </button>
        ))}
        <select className="input ml-auto !w-auto !py-1.5 text-xs" value={teamId} onChange={(e) => setTeamId(e.target.value)} aria-label="Filtra per equip">
          <option value="all">Tots els equips</option>
          {view.catTeams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 justify-items-center gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {shown.map(({ p, team, edition: ed }, i) => (
          <motion.button
            key={p.id}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: (i % 5) * 0.05 }}
            onClick={() => openModal({ kind: 'player', id: p.id })}
            className="rounded-2xl"
            aria-label={`Fitxa de ${p.name}`}
          >
            <LeagueCard player={p} team={team} edition={ed} size={200} />
          </motion.button>
        ))}
      </div>
    </div>
  );
}
