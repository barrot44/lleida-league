import { create } from 'zustand';

/** The site as an installable app: service worker + the browser's "install" prompt (Android / desktop Chrome). */

interface InstallEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface PwaStore {
  installEvent: InstallEvent | null;
  installed: boolean;
}

export const usePwaStore = create<PwaStore>()(() => ({ installEvent: null, installed: false }));

export const isStandalone = () => window.matchMedia?.('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;

export const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

export function installPwa() {
  usePwaStore.setState({ installed: isStandalone() });
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    usePwaStore.setState({ installEvent: e as InstallEvent });
  });
  window.addEventListener('appinstalled', () => usePwaStore.setState({ installEvent: null, installed: true }));
  if ('serviceWorker' in navigator && import.meta.env.PROD) {
    window.addEventListener('load', () => void navigator.serviceWorker.register('/sw.js').catch(() => {}));
  }
}

export async function promptInstall(): Promise<boolean> {
  const e = usePwaStore.getState().installEvent;
  if (!e) return false;
  await e.prompt();
  const { outcome } = await e.userChoice;
  usePwaStore.setState({ installEvent: null });
  return outcome === 'accepted';
}
