import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { CategoryId } from '@/types';
import { getAdminPassword, isAdminSession, setAdminSession } from '@/lib/auth';

export type ModalState =
  | { kind: 'team'; id: string }
  | { kind: 'player'; id: string }
  | { kind: 'match'; id: string };

export type ToastKind = 'success' | 'error' | 'info';

export interface Toast {
  id: number;
  message: string;
  kind: ToastKind;
}

interface UiState {
  category: CategoryId;
  setCategory: (c: CategoryId) => void;

  /** Stack so that closing a player opened from a team returns to that team. */
  modalStack: ModalState[];
  openModal: (m: ModalState) => void;
  closeModal: () => void;

  adminUnlocked: boolean;
  unlockAdmin: (password: string) => boolean;
  lockAdmin: () => void;

  toasts: Toast[];
  toast: (message: string, kind?: ToastKind) => void;
  dismissToast: (id: number) => void;
}

let toastSeq = 0;

export const useUiStore = create<UiState>()(
  persist(
    (set, get) => ({
      category: 'senior',
      setCategory: (category) => set({ category }),

      modalStack: [],
      openModal: (m) => set({ modalStack: [...get().modalStack, m] }),
      closeModal: () => set({ modalStack: get().modalStack.slice(0, -1) }),

      adminUnlocked: isAdminSession(),
      unlockAdmin: (password) => {
        const ok = password === getAdminPassword();
        if (ok) {
          setAdminSession(true);
          set({ adminUnlocked: true });
        }
        return ok;
      },
      lockAdmin: () => {
        setAdminSession(false);
        set({ adminUnlocked: false });
      },

      toasts: [],
      toast: (message, kind = 'success') => {
        const id = ++toastSeq;
        set({ toasts: [...get().toasts, { id, message, kind }].slice(-4) });
        setTimeout(() => get().dismissToast(id), 3800);
      },
      dismissToast: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
    }),
    {
      name: 'lleida-league:ui',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ category: s.category }),
    },
  ),
);
