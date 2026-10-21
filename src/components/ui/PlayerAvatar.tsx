import { useId, useState } from 'react';
import type { Player, Team } from '@/types';
import { cn, readableOn } from '@/lib/utils';

interface Props {
  player: Pick<Player, 'name' | 'photoUrl' | 'dorsal'>;
  team?: Pick<Team, 'primaryColor' | 'secondaryColor'>;
  size?: number;
  rounded?: boolean;
  className?: string;
}

/** Player portrait: custom photo when available, otherwise a jersey bust generated from the team colors. */
export function PlayerAvatar({ player, team, size = 48, rounded = true, className }: Props) {
  const [broken, setBroken] = useState(false);
  const uid = useId().replace(/:/g, '');
  const primary = team?.primaryColor ?? '#334155';
  const secondary = team?.secondaryColor ?? '#0f172a';
  const shape = rounded ? 'rounded-full' : 'rounded-2xl';

  if (player.photoUrl && !broken) {
    return (
      <img
        src={player.photoUrl}
        alt={player.name}
        loading="lazy"
        onError={() => setBroken(true)}
        className={cn('shrink-0 object-cover object-top', shape, className)}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <svg
      role="img"
      aria-label={player.name}
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={cn('shrink-0 overflow-hidden', shape, className)}
    >
      <defs>
        <radialGradient id={`${uid}-bg`} cx="50%" cy="30%" r="80%">
          <stop offset="0" stopColor={primary} stopOpacity="0.55" />
          <stop offset="1" stopColor={secondary} />
        </radialGradient>
        <linearGradient id={`${uid}-skin`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#e2e8f0" />
          <stop offset="1" stopColor="#94a3b8" />
        </linearGradient>
      </defs>
      <rect width="100" height="100" fill={`url(#${uid}-bg)`} />
      <path d="M12 104c0-27 15-40 38-40s38 13 38 40z" fill={primary} />
      <path d="M38 64c3 7 21 7 24 0l4 3c-5 12-27 12-32 0z" fill="#fff" opacity="0.2" />
      <path d="M12 104c0-8 1-15 4-21 2 8 4 15 5 21zM88 104c0-8-1-15-4-21-2 8-4 15-5 21z" fill={secondary} opacity="0.5" />
      <rect x="43" y="52" width="14" height="14" rx="5" fill={`url(#${uid}-skin)`} />
      <ellipse cx="50" cy="38" rx="15.5" ry="18" fill={`url(#${uid}-skin)`} />
      <path d="M34 34c0-12 7-19 16-19s17 7 16 19c-5-6-10-8-16-8s-11 2-16 8z" fill="#0f172a" opacity="0.85" />
      {size >= 44 && (
        <text
          x="50"
          y="92"
          textAnchor="middle"
          fontFamily="'Barlow Semi Condensed', Impact, sans-serif"
          fontWeight={900}
          fontSize="19"
          fill={readableOn(primary)}
        >
          {player.dorsal}
        </text>
      )}
    </svg>
  );
}
