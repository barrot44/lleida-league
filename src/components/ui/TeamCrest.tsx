import { useId, useState } from 'react';
import type { Team } from '@/types';
import { cn, readableOn } from '@/lib/utils';

type CrestTeam = Pick<Team, 'name' | 'shortName' | 'primaryColor' | 'secondaryColor' | 'logoUrl'>;

interface Props {
  team: CrestTeam;
  size?: number;
  className?: string;
}

/** Team badge: uses `logoUrl` when it loads, otherwise a shield generated from the team colors. */
export function TeamCrest({ team, size = 40, className }: Props) {
  const [broken, setBroken] = useState(false);
  const uid = useId().replace(/:/g, '');
  const height = Math.round(size * 1.12);

  if (team.logoUrl && !broken) {
    return (
      <img
        src={team.logoUrl}
        alt={team.name}
        width={size}
        height={height}
        loading="lazy"
        onError={() => setBroken(true)}
        className={cn('shrink-0 object-contain', className)}
        style={{ width: size, height }}
      />
    );
  }

  const text = readableOn(team.primaryColor);
  const label = team.shortName.slice(0, 3).toUpperCase();
  return (
    <svg
      role="img"
      aria-label={team.name}
      viewBox="0 0 100 112"
      width={size}
      height={height}
      className={cn('shrink-0 drop-shadow-[0_4px_10px_rgba(0,0,0,0.55)]', className)}
    >
      <defs>
        <linearGradient id={`${uid}-bg`} x1="0" y1="0" x2="0.9" y2="1">
          <stop offset="0" stopColor={team.primaryColor} />
          <stop offset="1" stopColor={team.secondaryColor} />
        </linearGradient>
        <linearGradient id={`${uid}-gloss`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.38" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <clipPath id={`${uid}-clip`}>
          <path d="M50 3 92 16v40c0 29-20 43-42 53C28 99 8 85 8 56V16z" />
        </clipPath>
      </defs>
      <path d="M50 3 92 16v40c0 29-20 43-42 53C28 99 8 85 8 56V16z" fill={`url(#${uid}-bg)`} />
      <g clipPath={`url(#${uid}-clip)`}>
        <path d="M-10 46 110 20v18L-10 64z" fill="#fff" opacity="0.14" />
        <rect x="0" y="0" width="100" height="52" fill={`url(#${uid}-gloss)`} />
      </g>
      <path d="M50 3 92 16v40c0 29-20 43-42 53C28 99 8 85 8 56V16z" fill="none" stroke="#FBBF24" strokeWidth="4" strokeLinejoin="round" />
      <path d="M50 11 85 22v34c0 23-16 35-35 43C31 91 15 79 15 56V22z" fill="none" stroke="#fff" strokeOpacity="0.28" strokeWidth="1.5" />
      <text
        x="50"
        y="66"
        textAnchor="middle"
        fontFamily="'Barlow Semi Condensed', Impact, sans-serif"
        fontWeight={900}
        fontSize={label.length > 2 ? 33 : 40}
        letterSpacing="1"
        fill={text}
        stroke={text === '#ffffff' ? '#000' : 'none'}
        strokeOpacity="0.35"
        strokeWidth="1"
        paintOrder="stroke"
      >
        {label}
      </text>
    </svg>
  );
}
