import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { CreditCard, Crown, Flame, Goal, Shield, Star, Target, Trophy, Zap, type LucideIcon } from 'lucide-react';
import type { CategoryId } from '@/types';
import { EmptyState } from '@/components/ui/Section';
import { useLeagueView } from '@/hooks/useLeagueView';
import { computeRecords, type RecordIcon } from '@/lib/records';
import { useUiStore } from '@/store/useUiStore';

const ICONS: Record<RecordIcon, LucideIcon> = { flame: Flame, goal: Goal, shield: Shield, zap: Zap, crown: Crown, star: Star, card: CreditCard, target: Target };

/** League records computed on the fly from finished matches. */
export function RecordsView({ category }: { category: CategoryId }) {
  const view = useLeagueView(category);
  const openModal = useUiStore((s) => s.openModal);
  const cards = useMemo(() => computeRecords(view.catMatches, view.catTeams, view.catPlayers), [view.catMatches, view.catTeams, view.catPlayers]);

  if (cards.length === 0) return <EmptyState icon={<Trophy />} title="Encara sense rècords" hint="Quan es disputin partits, aquí apareixeran les golejades, ratxes i marques de la lliga." />;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((c, i) => {
        const Icon = ICONS[c.icon];
        const action = c.matchId ? () => openModal({ kind: 'match', id: c.matchId as string }) : c.playerId ? () => openModal({ kind: 'player', id: c.playerId as string }) : c.teamId ? () => openModal({ kind: 'team', id: c.teamId as string }) : undefined;
        return (
          <motion.button
            key={c.id}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i, 9) * 0.05 }}
            onClick={action}
            disabled={!action}
            className="card-hover relative overflow-hidden p-5 text-left disabled:cursor-default"
          >
            <Icon aria-hidden size={92} className="absolute -right-4 -top-4 text-white/[0.04]" />
            <span className="mb-3 grid h-10 w-10 place-items-center rounded-xl bg-amber-400/15 text-amber-300">
              <Icon size={20} />
            </span>
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">{c.title}</p>
            <p className="digital text-gold-gradient mt-1 text-4xl leading-none">{c.value}</p>
            <p className="mt-2 text-sm text-slate-300">{c.detail}</p>
          </motion.button>
        );
      })}
    </div>
  );
}
