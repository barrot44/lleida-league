import * as Dialog from '@radix-ui/react-dialog';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  /** Hides the visual header (the title stays available to screen readers) — for modals with their own hero. */
  hideHeader?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  className?: string;
  children: ReactNode;
}

const SIZES = { sm: 'sm:max-w-md', md: 'sm:max-w-xl', lg: 'sm:max-w-3xl', xl: 'sm:max-w-5xl', full: 'sm:max-w-[96vw]' } as const;

/** Accessible dialog (Radix) with animated backdrop and a bottom-sheet layout on phones. */
export function Modal({ open, onOpenChange, title, hideHeader, size = 'lg', className, children }: Props) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild forceMount>
              <motion.div
                className="fixed inset-0 z-[80] bg-black/75 backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              />
            </Dialog.Overlay>
            <Dialog.Content asChild forceMount aria-describedby={undefined}>
              <motion.div
                className={cn(
                  'glass-strong fixed inset-x-0 bottom-0 z-[90] mx-auto max-h-[92dvh] w-full overflow-y-auto rounded-t-3xl shadow-2xl outline-none',
                  'sm:inset-x-4 sm:bottom-auto sm:top-[5vh] sm:max-h-[90vh] sm:rounded-3xl',
                  SIZES[size],
                  className,
                )}
                initial={{ opacity: 0, y: 48, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 32, scale: 0.98 }}
                transition={{ type: 'spring', damping: 30, stiffness: 340 }}
              >
                {hideHeader ? (
                  <Dialog.Title className="sr-only">{title}</Dialog.Title>
                ) : (
                  <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-white/10 bg-surface/95 px-5 py-4 backdrop-blur-xl sm:px-6">
                    <Dialog.Title className="font-display text-xl font-black uppercase tracking-tight text-white">{title}</Dialog.Title>
                    <Dialog.Close className="btn-ghost !p-2" aria-label="Tanca">
                      <X size={18} />
                    </Dialog.Close>
                  </div>
                )}
                {hideHeader && (
                  <Dialog.Close
                    className="absolute right-3 top-3 z-20 grid h-9 w-9 place-items-center rounded-full border border-white/15 bg-black/50 text-white backdrop-blur transition hover:scale-110 hover:border-amber-400/60"
                    aria-label="Tanca"
                  >
                    <X size={18} />
                  </Dialog.Close>
                )}
                {children}
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
