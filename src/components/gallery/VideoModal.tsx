import { ExternalLink } from 'lucide-react';
import type { VideoItem } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { CATEGORY_BY_ID } from '@/config/site';
import { PROVIDER_LABEL, parseVideo } from '@/lib/video';
import { cn, formatDateShort } from '@/lib/utils';

/** Plays a YouTube / TikTok / Instagram video inside the site (falls back to a link for anything else). */
export function VideoModal({ video, open, onClose }: { video: VideoItem; open: boolean; onClose: () => void }) {
  const parsed = parseVideo(video.url);
  const cat = video.category === 'general' ? 'General' : CATEGORY_BY_ID[video.category].short;
  return (
    <Modal open={open} onOpenChange={(o) => !o && onClose()} title={video.title} size={parsed.vertical ? 'sm' : 'lg'}>
      <div className="space-y-4 p-4 sm:p-5">
        {parsed.embedUrl ? (
          <div className={cn('mx-auto overflow-hidden rounded-2xl bg-black', parsed.vertical ? 'aspect-[9/16] max-h-[70vh]' : 'aspect-video w-full')}>
            <iframe
              src={parsed.embedUrl}
              title={video.title}
              className="h-full w-full"
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
            />
          </div>
        ) : (
          <p className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center text-sm text-slate-300">Aquest vídeo s’obre en una pestanya nova.</p>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs uppercase tracking-wider text-slate-400">
            {cat}
            {video.matchday ? ` · Jornada ${video.matchday}` : ''} · {formatDateShort(video.date)}
          </p>
          <a href={video.url} target="_blank" rel="noopener noreferrer" className="btn-ghost !px-3 !py-1.5 text-xs">
            <ExternalLink size={14} /> Obre a {PROVIDER_LABEL[parsed.provider]}
          </a>
        </div>
      </div>
    </Modal>
  );
}
