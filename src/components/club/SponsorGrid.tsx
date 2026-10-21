import { useState } from 'react';
import { motion } from 'framer-motion';
import type { Sponsor } from '@/types';
import { cn } from '@/lib/utils';

function SponsorLogo({ sponsor, compact }: { sponsor: Sponsor; compact?: boolean }) {
  const [broken, setBroken] = useState(false);
  const inner = (
    <>
      <div className={cn('relative grid place-items-center overflow-hidden rounded-xl bg-white', compact ? 'h-20' : 'h-28')}>
        {sponsor.logoUrl && !broken ? (
          <img
            src={sponsor.logoUrl}
            alt={sponsor.name}
            loading="lazy"
            onError={() => setBroken(true)}
            className={cn('absolute inset-0 h-full w-full object-contain', compact ? 'p-1.5' : 'p-2.5')}
          />
        ) : (
          <span className="px-2 text-center font-display text-lg font-black uppercase leading-tight text-slate-800">{sponsor.name}</span>
        )}
      </div>
      <p className="mt-2 truncate text-center text-xs font-bold uppercase tracking-wider text-slate-400 transition group-hover:text-amber-300">{sponsor.name}</p>
    </>
  );
  const cls = 'group block rounded-2xl border border-white/[0.08] bg-surface/60 p-2.5 transition hover:-translate-y-1 hover:border-amber-400/50 hover:shadow-glow';
  return sponsor.url ? (
    <a href={sponsor.url} target="_blank" rel="noopener noreferrer" className={cls} aria-label={`${sponsor.name} (s’obre en una pestanya nova)`}>
      {inner}
    </a>
  ) : (
    <div className={cls}>{inner}</div>
  );
}

export function SponsorGrid({ sponsors, compact }: { sponsors: Sponsor[]; compact?: boolean }) {
  return (
    <ul className={cn('grid gap-3', compact ? 'grid-cols-3 md:grid-cols-5 lg:grid-cols-9' : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4')}>
      {sponsors.map((s, i) => (
        <motion.li
          key={s.id}
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-30px' }}
          transition={{ duration: 0.4, delay: Math.min(i, 8) * 0.05 }}
        >
          <SponsorLogo sponsor={s} compact={compact} />
        </motion.li>
      ))}
    </ul>
  );
}
