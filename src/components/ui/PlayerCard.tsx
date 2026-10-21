import type { Player, Team } from '@/types';
import { playerRating } from '@/lib/standings';
import { POSITION_SHORT } from '@/config/site';
import { PlayerAvatar } from '@/components/ui/PlayerAvatar';
import { TeamCrest } from '@/components/ui/TeamCrest';
import { TiltCard } from '@/components/ui/TiltCard';

interface Props {
  player: Player;
  team?: Team;
  /** Card width in px — every inner measure is in `em`, so the card scales perfectly. */
  size?: number;
  /** Small ribbon above the card (e.g. "MVP de la semana"). */
  ribbon?: string;
  tilt?: boolean;
  onClick?: () => void;
}

/** FIFA / Kings League style collectible card with holographic tilt. */
export function PlayerCard({ player, team, size = 260, ribbon, tilt = true, onClick }: Props) {
  const rating = playerRating(player);
  const primary = team?.primaryColor ?? '#F59E0B';
  const elite = rating >= 85;
  const s = player.stats;

  const body = (
    <div
      className="relative rounded-[1.7em] p-[0.14em] text-left shadow-card"
      style={{
        width: size,
        fontSize: size / 20,
        background: elite
          ? 'linear-gradient(145deg,#fff3c4,#fbbf24 30%,#b45309 60%,#fde68a)'
          : 'linear-gradient(145deg,#e2e8f0,#94a3b8 40%,#475569 70%,#cbd5e1)',
        boxShadow: `0 1.2em 3em -1em ${primary}88`,
      }}
    >
      <div
        className="relative overflow-hidden rounded-[1.58em]"
        style={{
          aspectRatio: '20 / 28.5',
          background: `radial-gradient(120% 70% at 85% 0%, ${primary}66, transparent 62%), linear-gradient(170deg,#141d36,#070a12 75%)`,
        }}
      >
        {/* ghost dorsal */}
        <span
          aria-hidden
          className="pointer-events-none absolute -right-[0.1em] top-[0.2em] select-none font-display text-[13em] font-black leading-none text-white/[0.05]"
        >
          {player.dorsal}
        </span>
        <div aria-hidden className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: 'repeating-linear-gradient(135deg,#fff 0 1px,transparent 1px 9px)' }} />

        {ribbon && (
          <div className="absolute left-0 top-[0.9em] z-10 rounded-r-full bg-gold-gradient py-[0.25em] pl-[1.4em] pr-[0.9em] font-display text-[0.8em] font-black uppercase tracking-widest text-slate-950">
            {ribbon}
          </div>
        )}

        <div className="absolute left-[1.5em] top-[3em] z-10 flex flex-col items-center gap-[0.35em]">
          <span className="text-gold-gradient font-display text-[3.6em] font-black leading-none">{rating}</span>
          <span className="font-display text-[1.15em] font-black tracking-[0.18em] text-white">{POSITION_SHORT[player.position]}</span>
          {team && <TeamCrest team={team} size={size / 7.5} />}
        </div>

        <div
          className="absolute -right-[0.4em] top-[2.2em] z-0"
          style={{ WebkitMaskImage: 'linear-gradient(to bottom,#000 62%,transparent 98%)', maskImage: 'linear-gradient(to bottom,#000 62%,transparent 98%)' }}
        >
          <PlayerAvatar player={player} team={team} size={size * 0.74} rounded={false} className="!rounded-none" />
        </div>

        <div className="absolute inset-x-[1.2em] bottom-[6.6em] z-10 text-center">
          <p className="truncate font-display text-[1.95em] font-black uppercase leading-tight tracking-tight text-white drop-shadow">{player.name}</p>
          {player.nickname && <p className="truncate text-[0.85em] font-bold uppercase tracking-[0.2em] text-cyan-300">“{player.nickname}”</p>}
        </div>

        <div className="absolute inset-x-[1.4em] bottom-[1.4em] z-10">
          <div className="mb-[0.8em] h-px bg-gradient-to-r from-transparent via-amber-400/70 to-transparent" />
          <dl className="grid grid-cols-5 text-center">
            {[
              ['GOL', s.goals],
              ['ASS', s.assists],
              ['MVP', s.mvpAwards],
              ['PJ', s.matchesPlayed],
              ['TG', s.yellowCards],
            ].map(([label, value]) => (
              <div key={label}>
                <dd className="font-display text-[1.7em] font-black leading-none text-white">{value}</dd>
                <dt className="mt-[0.25em] text-[0.68em] font-bold tracking-[0.16em] text-amber-300/90">{label}</dt>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  );

  const content = tilt ? (
    <TiltCard className="rounded-[1.7em]" max={11}>
      {body}
    </TiltCard>
  ) : (
    body
  );

  if (!onClick) return content;
  return (
    <button type="button" onClick={onClick} className="block rounded-[1.7em] text-left transition-transform hover:scale-[1.02]" aria-label={`Veure la fitxa de ${player.name}`}>
      {content}
    </button>
  );
}
