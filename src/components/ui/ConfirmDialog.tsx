import { AlertTriangle } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';

interface Props {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ open, title, message, confirmLabel = 'Confirmar', danger = true, onConfirm, onCancel }: Props) {
  return (
    <Modal open={open} onOpenChange={(o) => !o && onCancel()} title={title} size="sm">
      <div className="space-y-6 p-6">
        <div className="flex gap-4">
          <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${danger ? 'bg-red-500/15 text-red-400' : 'bg-amber-400/15 text-amber-400'}`}>
            <AlertTriangle size={22} />
          </div>
          <p className="text-sm leading-relaxed text-slate-300">{message}</p>
        </div>
        <div className="flex justify-end gap-3">
          <button className="btn-ghost" onClick={onCancel}>
            Cancelar
          </button>
          <button className={danger ? 'btn-danger' : 'btn-gold'} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}
