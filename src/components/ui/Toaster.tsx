import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { useUiStore, type ToastKind } from '@/store/useUiStore';
import { cn } from '@/lib/utils';

const STYLE: Record<ToastKind, { icon: typeof Info; ring: string; text: string }> = {
  success: { icon: CheckCircle2, ring: 'border-emerald-400/40 shadow-emerald', text: 'text-emerald-400' },
  error: { icon: AlertTriangle, ring: 'border-red-400/40 shadow-red', text: 'text-red-400' },
  info: { icon: Info, ring: 'border-cyan-400/40 shadow-cyan', text: 'text-cyan-400' },
};

export function Toaster() {
  const toasts = useUiStore((s) => s.toasts);
  const dismiss = useUiStore((s) => s.dismissToast);

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-24 z-[100] flex flex-col items-center gap-2 px-4 md:bottom-6"
    >
      <AnimatePresence>
        {toasts.map((t) => {
          const s = STYLE[t.kind];
          const Icon = s.icon;
          return (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 24, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.95 }}
              transition={{ type: 'spring', damping: 26, stiffness: 320 }}
              className={cn('glass-strong pointer-events-auto flex max-w-md items-center gap-3 rounded-2xl border px-4 py-3', s.ring)}
              role="status"
            >
              <Icon size={20} className={s.text} />
              <p className="text-sm font-semibold text-white">{t.message}</p>
              <button onClick={() => dismiss(t.id)} className="ml-1 text-slate-400 transition hover:text-white" aria-label="Tanca l’avís">
                <X size={16} />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
