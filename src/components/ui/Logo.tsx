import { cn } from '@/lib/utils';

interface Props {
  size?: number;
  className?: string;
  glow?: boolean;
}

/** The official badge, clipped to its circle (the source PNG has a white margin). */
export function Logo({ size = 44, className, glow = true }: Props) {
  return (
    <span
      className={cn('relative inline-block shrink-0 overflow-hidden rounded-full bg-[#1b2a4e]', glow && 'shadow-glow ring-1 ring-amber-400/40', className)}
      style={{ width: size, height: size }}
    >
      <img
        src={`${import.meta.env.BASE_URL}logo.png`}
        alt="Lleida League — Futsal"
        width={size}
        height={size}
        className="h-full w-full scale-[1.17] object-cover"
        draggable={false}
      />
    </span>
  );
}
