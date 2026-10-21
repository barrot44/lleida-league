import { motion } from 'framer-motion';
import type { Player, Team } from '@/types';
import { PlayerAvatar } from '@/components/ui/PlayerAvatar';
import { TeamCrest } from '@/components/ui/TeamCrest';
import { useUiStore } from '@/store/useUiStore';
import { cn } from '@/lib/utils';

interface Entry {
  player: Player;
  team?: Team;
  value: number;
}

const MEDALS = [
  { place: 1, label: 'Oro', ring: 'ring-amber-400', grad: 'from-amber-300 via-amber-500 to-amber-700', glow: 'shadow-glow-lg', text: 'text-amber-300', height: 'h-36 sm:h-44', avatar: 96 },
  { place: 2, label: 'Plata', ring: 'ring-slate-300', grad: 'from-slate-100 via-slate-300 to-slate-500', glow: 'shadow-[0_0_34px_-6px_rgba(203,213,225,.55)]', text: 'text-slate-200', height: 'h-24 sm:h-32', avatar: 76 },
  { place: 3, label: 'Bronce', ring: 'ring-orange-500', grad: 'from-orange-300 via-orange-500 to-orange-800', glow: 'shadow-[0_0_34px_-6px_rgba(249,115,22,.55)]', text: 'text-orange-300', height: 'h-16 sm:h-24', avatar: 76 },
] as const;

export function Podium({ entries, unit }: { entries: Entry[]; unit: string }) {
  const openModal = useUiStore((s) => s.openModal);
  // visual order: 2nd · 1st · 3rd
  const order = [1, 0, 2];

  return (
    <div className="mx-auto grid max-w-3xl grid-cols-3 items-end gap-2 sm:gap-5">
      {order.map((idx) => {
        const entry = entries[idx];
        const medal = MEDALS[idx];
        if (!entry) return <div key={idx} />;
        const { player, team, value } = entry;
        return (
          <motion.button
            key={player.id}
            onClick={() => openModal({ kind: 'player', id: player.id })}
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: idx === 0 ? 0.35 : idx === 1 ? 0.15 : 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="group flex flex-col items-center text-center"
          >
            <div className="relative">
              {idx === 0 && <span className="absolute -top-7 left-1/2 -translate-x-1/2 animate-glow-breathe text-3xl">👑</span>}
              <PlayerAvatar player={player} team={team} size={medal.avatar} className={cn('ring-4 transition-transform duration-300 group-hover:scale-105', medal.ring, medal.glow)} />
              <span className={cn('absolute -bottom-2 -right-1 grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br font-display text-base font-black text-slate-950 shadow-lg', medal.grad)}>
                {medal.place}
              </span>
            </div>
            <p className="mt-4 line-clamp-2 min-h-[2.4em] font-display text-base font-black uppercase leading-tight text-white sm:text-xl">{player.name}</p>
            <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
              {team && <TeamCrest team={team} size={16} />} {team?.shortName}
            </p>
            <div
              className={cn('mt-3 flex w-full flex-col items-center justify-start rounded-t-2xl border border-b-0 border-white/15 bg-gradient-to-b pt-3', medal.height, medal.grad)}
              style={{ transformOrigin: 'bottom' }}
            >
              <span className="digital text-4xl leading-none text-slate-950 sm:text-5xl">{value}</span>
              <span className="mt-1 text-[10px] font-black uppercase tracking-widest text-slate-900/70">{unit}</span>
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}
