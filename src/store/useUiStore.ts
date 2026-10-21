import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { CategoryId } from '@/types';
import { getAdminPassword, isAdminSession, setAdminSession } from '@/lib/auth';
import { signInAdmin, signOutAdmin, supabaseEnabled } from '@/lib/supabase';

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

export type SyncStatus = 'off' | 'idle' | 'syncing' | 'error' | 'conflict';

interface UiState {
  category: CategoryId;
  setCategory: (c: CategoryId) => void;

  /** Stack so that closing a player opened from a team returns to that team. */
  modalStack: ModalState[];
  openModal: (m: ModalState) => void;
  closeModal: () => void;

  /** `true` once the admin is signed in (Supabase session) or unlocked with the local demo password. */
  adminUnlocked: boolean;
  adminEmail: string | null;
  /** Local mode only (no Supabase): checks the demo password. */
  unlockAdmin: (password: string) => boolean;
  /** Supabase mode: real email + password login. Resolves with an error message, or `null` on success. */
  signIn: (email: string, password: string) => Promise<string | null>;
  setAdminSession: (email: string | null) => void;
  lockAdmin: () => void;

  syncStatus: SyncStatus;
  setSyncStatus: (s: SyncStatus) => void;
  /** `false` until the first read of the shared data finished (avoids flashing demo data on first load). */
  remoteReady: boolean;
  setRemoteReady: (ready: boolean) => void;

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

      adminUnlocked: supabaseEnabled ? false : isAdminSession(),
      adminEmail: null,
      unlockAdmin: (password) => {
        const ok = password === getAdminPassword();
        if (ok) {
          setAdminSession(true);
          set({ adminUnlocked: true });
        }
        return ok;
      },
      signIn: async (email, password) => {
        const res = await signInAdmin(email, password);
        if (!res.ok) return res.error;
        set({ adminUnlocked: true, adminEmail: res.email });
        return null;
      },
      setAdminSession: (email) => set({ adminUnlocked: email !== null, adminEmail: email }),
      lockAdmin: () => {
        if (supabaseEnabled) void signOutAdmin();
        else setAdminSession(false);
        set({ adminUnlocked: false, adminEmail: null });
      },

      syncStatus: supabaseEnabled ? 'idle' : 'off',
      setSyncStatus: (syncStatus) => set({ syncStatus }),
      remoteReady: !supabaseEnabled,
      setRemoteReady: (remoteReady) => set({ remoteReady }),

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
