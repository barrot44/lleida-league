import { motion } from 'framer-motion';
import { Newspaper } from 'lucide-react';
import type { NewsItem } from '@/types';
import { NewsBadgeTag } from '@/components/ui/Badges';
import { EmptyState } from '@/components/ui/Section';
import { formatDateShort } from '@/lib/utils';

export function NewsList({ items }: { items: NewsItem[] }) {
  if (items.length === 0) return <EmptyState icon={<Newspaper />} title="Sense comunicats" hint="Els comunicats presidencials apareixeran aquí." />;
  return (
    <ul className="space-y-3">
      {items.map((n, i) => (
        <motion.li
          key={n.id}
          initial={{ opacity: 0, x: 18 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.4, delay: i * 0.06 }}
          className="card-hover p-4"
        >
          <div className="mb-2 flex items-center justify-between gap-3">
            <NewsBadgeTag badge={n.badge} />
            <time className="text-xs text-slate-500" dateTime={n.date}>
              {formatDateShort(n.date)}
            </time>
          </div>
          <h3 className="text-lg leading-snug">{n.headline}</h3>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{n.summary}</p>
        </motion.li>
      ))}
    </ul>
  );
}
