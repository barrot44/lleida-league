import { useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

function hash(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Generated pitch artwork — used when a photo URL is missing or fails to load. */
export function PitchArt({ seed, className }: { seed: string; className?: string }) {
  const h = hash(seed);
  const hue = [38, 190, 160, 330, 265][h % 5];
  return (
    <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" className={cn('h-full w-full', className)} aria-hidden>
      <defs>
        <linearGradient id={`pa-${h}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={`hsl(${hue} 70% 22%)`} />
          <stop offset="1" stopColor="#080b11" />
        </linearGradient>
      </defs>
      <rect width="400" height="300" fill={`url(#pa-${h})`} />
      <g fill="none" stroke={`hsl(${hue} 90% 70%)`} strokeOpacity="0.35" strokeWidth="2">
        <rect x="30" y="30" width="340" height="240" rx="6" />
        <path d="M200 30v240" />
        <circle cx="200" cy="150" r="46" />
        <rect x="30" y="100" width="48" height="100" />
        <rect x="322" y="100" width="48" height="100" />
      </g>
      <circle cx="200" cy="150" r="18" fill="#fff" fillOpacity="0.9" />
      <path d="m200 138 10 7-4 12h-12l-4-12z" fill="#0f172a" />
    </svg>
  );
}

interface Props {
  src: string;
  alt: string;
  seed?: string;
  className?: string;
  fallback?: ReactNode;
}

/** `<img>` that gracefully degrades to generated artwork when the URL is broken or offline. */
export function SmartImage({ src, alt, seed, className, fallback }: Props) {
  const [broken, setBroken] = useState(false);
  if (broken || !src) return <>{fallback ?? <PitchArt seed={seed ?? alt} className={className} />}</>;
  return <img src={src} alt={alt} loading="lazy" onError={() => setBroken(true)} className={className} draggable={false} />;
}
