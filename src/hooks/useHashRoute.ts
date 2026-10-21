import { useEffect, useState } from 'react';
import { ALL_ROUTES, type RouteId } from '@/config/nav';

const readRoute = (): RouteId => {
  const path = window.location.hash.replace(/^#/, '') || '/';
  return ALL_ROUTES.find((r) => r.path === path)?.id ?? 'home';
};

/** Minimal hash router: works on any static host without server rewrites. */
export function useRoute(): RouteId {
  const [route, setRoute] = useState<RouteId>(readRoute);
  useEffect(() => {
    const onChange = () => {
      setRoute(readRoute());
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}

export const hrefFor = (id: RouteId) => `#${ALL_ROUTES.find((r) => r.id === id)?.path ?? '/'}`;

export const navigate = (id: RouteId) => {
  window.location.hash = hrefFor(id);
};
