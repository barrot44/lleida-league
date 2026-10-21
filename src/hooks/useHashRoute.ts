import { useSyncExternalStore } from 'react';
import { ALL_ROUTES, type RouteId } from '@/config/nav';

/**
 * Minimal History-API router. Every page has a real URL (`/classificacio`, `/calendari`…), which is what lets
 * search engines index them one by one. Hosts must serve `index.html` for unknown paths (see vercel.json / netlify.toml).
 * (The file keeps its old name to avoid touching every import.)
 */
const EVENT = 'll:navigate';

const currentPath = () => window.location.pathname.replace(/\/+$/, '') || '/';
const readRoute = (): RouteId => ALL_ROUTES.find((r) => r.path === currentPath())?.id ?? 'home';

const subscribe = (cb: () => void) => {
  window.addEventListener('popstate', cb);
  window.addEventListener(EVENT, cb);
  return () => {
    window.removeEventListener('popstate', cb);
    window.removeEventListener(EVENT, cb);
  };
};

export const useRoute = (): RouteId => useSyncExternalStore(subscribe, readRoute, () => 'home');

export const hrefFor = (id: RouteId) => ALL_ROUTES.find((r) => r.id === id)?.path ?? '/';

function go(path: string) {
  if (window.location.pathname !== path) window.history.pushState(null, '', path);
  window.dispatchEvent(new Event(EVENT));
  window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
}

export const navigate = (id: RouteId) => go(hrefFor(id));

/** Call once at startup: migrates old `#/path` links and turns internal link clicks into SPA navigations. */
export function installRouter() {
  const legacy = window.location.hash;
  if (legacy.startsWith('#/')) window.history.replaceState(null, '', legacy.slice(1));

  document.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const anchor = (e.target as Element | null)?.closest('a');
    if (!anchor || anchor.target === '_blank' || anchor.hasAttribute('download')) return;
    const href = anchor.getAttribute('href');
    if (!href || !href.startsWith('/') || href.startsWith('//')) return;
    const path = href.split(/[?#]/)[0];
    if (!ALL_ROUTES.some((r) => r.path === path)) return;
    e.preventDefault();
    go(path);
  });
}
