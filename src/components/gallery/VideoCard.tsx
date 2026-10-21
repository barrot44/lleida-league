import { motion } from 'framer-motion';
import { Play } from 'lucide-react';
import type { VideoItem } from '@/types';
import { SmartImage } from '@/components/ui/SmartImage';
import { CATEGORY_BY_ID } from '@/config/site';
import { PROVIDER_LABEL, parseVideo } from '@/lib/video';
import { formatDateShort } from '@/lib/utils';

export function VideoCard({ video, onOpen, index = 0 }: { video: VideoItem; onOpen: (v: VideoItem) => void; index?: number }) {
  const parsed = parseVideo(video.url);
  const cat = video.category === 'general' ? null : CATEGORY_BY_ID[video.category];
  return (
    <motion.button
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: Math.min(index, 8) * 0.05 }}
      onClick={() => onOpen(video)}
      className="group card-hover overflow-hidden text-left"
      aria-label={`Reprodueix: ${video.title}`}
    >
      <div className="relative aspect-video overflow-hidden bg-pitch">
        {parsed.thumbnail ? (
          <SmartImage src={parsed.thumbnail} alt="" seed={video.id} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" />
        ) : (
          <div className="grid h-full w-full place-items-center bg-gradient-to-br from-amber-400/20 via-surface to-cyan-400/10 font-display text-2xl font-black uppercase text-white/70">{PROVIDER_LABEL[parsed.provider]}</div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
        <span className="absolute left-1/2 top-1/2 grid h-14 w-14 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-gold-gradient text-slate-950 shadow-glow-lg transition group-hover:scale-110">
          <Play size={24} fill="currentColor" />
        </span>
        <span className="absolute right-2.5 top-2.5 rounded-md bg-black/60 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-white backdrop-blur">{PROVIDER_LABEL[parsed.provider]}</span>
      </div>
      <div className="p-4">
        <p className="line-clamp-2 font-display text-lg font-black uppercase leading-tight text-white">{video.title}</p>
        <p className="mt-1.5 flex flex-wrap items-center gap-x-2 text-xs text-slate-400">
          {cat && (
            <span className="font-bold uppercase tracking-wider" style={{ color: cat.accent }}>
              {cat.short}
            </span>
          )}
          {video.matchday && <span>J{video.matchday}</span>}
          <span>{formatDateShort(video.date)}</span>
        </p>
      </div>
    </motion.button>
  );
}
