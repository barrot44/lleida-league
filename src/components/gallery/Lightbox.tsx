import { useCallback, useEffect, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import type { GalleryItem } from '@/types';
import { SmartImage } from '@/components/ui/SmartImage';
import { formatDateShort } from '@/lib/utils';

interface Props {
  items: GalleryItem[];
  index: number | null;
  onIndexChange: (i: number | null) => void;
}

/** Full-screen photo viewer with keyboard (←/→/Esc), swipe and thumbnail navigation. */
export function Lightbox({ items, index, onIndexChange }: Props) {
  const [direction, setDirection] = useState(1);
  const open = index !== null && items[index] !== undefined;
  const item = open ? items[index as number] : undefined;

  const go = useCallback(
    (delta: number) => {
      if (index === null || items.length === 0) return;
      setDirection(delta);
      onIndexChange((index + delta + items.length) % items.length);
    },
    [index, items.length, onIndexChange],
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') go(1);
      if (e.key === 'ArrowLeft') go(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, go]);

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onIndexChange(null)}>
      <AnimatePresence>
        {open && item && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild forceMount>
              <motion.div className="fixed inset-0 z-[80] bg-black/95 backdrop-blur-md" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
            </Dialog.Overlay>
            <Dialog.Content asChild forceMount aria-describedby={undefined}>
              <motion.div
                className="fixed inset-0 z-[90] flex flex-col outline-none"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <Dialog.Title className="sr-only">{item.title}</Dialog.Title>
                <div className="flex items-center justify-between px-4 py-3 text-sm text-slate-300 sm:px-6">
                  <span className="digital text-lg">
                    {(index as number) + 1} <span className="text-slate-600">/</span> {items.length}
                  </span>
                  <Dialog.Close className="grid h-10 w-10 place-items-center rounded-full border border-white/15 bg-white/10 text-white transition hover:scale-110 hover:border-amber-400/60" aria-label="Cerrar">
                    <X size={20} />
                  </Dialog.Close>
                </div>

                <div className="relative flex min-h-0 flex-1 items-center justify-center px-2 sm:px-16">
                  <button onClick={() => go(-1)} className="absolute left-2 z-10 grid h-12 w-12 place-items-center rounded-full border border-white/15 bg-black/50 text-white backdrop-blur transition hover:scale-110 hover:border-amber-400/60 sm:left-5" aria-label="Foto anterior">
                    <ChevronLeft size={26} />
                  </button>
                  <AnimatePresence mode="popLayout" custom={direction} initial={false}>
                    <motion.div
                      key={item.id}
                      custom={direction}
                      initial={{ opacity: 0, x: direction * 80 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: direction * -80 }}
                      transition={{ duration: 0.3 }}
                      drag="x"
                      dragConstraints={{ left: 0, right: 0 }}
                      dragElastic={0.4}
                      onDragEnd={(_, info) => {
                        if (info.offset.x < -80) go(1);
                        else if (info.offset.x > 80) go(-1);
                      }}
                      className="flex h-full max-h-[70vh] w-full max-w-5xl items-center justify-center"
                    >
                      <SmartImage
                        src={item.imageUrl.replace(/([?&])w=\d+/, '$1w=1600')}
                        alt={item.title}
                        seed={item.id}
                        className="max-h-full max-w-full rounded-2xl border border-white/10 object-contain shadow-2xl"
                      />
                    </motion.div>
                  </AnimatePresence>
                  <button onClick={() => go(1)} className="absolute right-2 z-10 grid h-12 w-12 place-items-center rounded-full border border-white/15 bg-black/50 text-white backdrop-blur transition hover:scale-110 hover:border-amber-400/60 sm:right-5" aria-label="Foto siguiente">
                    <ChevronRight size={26} />
                  </button>
                </div>

                <div className="mx-auto w-full max-w-3xl px-5 pb-6 pt-4 text-center">
                  <h3 className="text-2xl text-white">{item.title}</h3>
                  <p className="mt-1 text-sm text-slate-300">{item.caption}</p>
                  <p className="mt-2 flex flex-wrap items-center justify-center gap-2 text-xs text-slate-500">
                    {formatDateShort(item.date)}
                    {item.matchday ? ` · Jornada ${item.matchday}` : ''}
                    {item.tags.map((t) => (
                      <span key={t} className="rounded-md bg-white/[0.07] px-2 py-0.5 text-slate-400">
                        #{t}
                      </span>
                    ))}
                  </p>
                </div>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
