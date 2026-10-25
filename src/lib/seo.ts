import { useEffect } from 'react';
import { ALL_ROUTES, type RouteId } from '@/config/nav';

const BASE_TITLE = 'Lleida League · Futbol sala';

const META: Record<RouteId, { title: string; description: string }> = {
  home: {
    title: `${BASE_TITLE} · Més que un joc, una batalla presidencial`,
    description: 'Lleida League: el torneig presidencial de futbol sala de les terres de Lleida. Classificació en directe, resultats, golejadors, MVPs, galeria i vídeos de la Senior, Juvenil, Junior i Femenina.',
  },
  standings: {
    title: `Classificació · ${BASE_TITLE}`,
    description: 'Classificació en directe de la Lleida League: punts, gols, ratxa dels equips i evolució jornada a jornada de la Senior, Juvenil, Junior i Femenina.',
  },
  calendar: {
    title: `Calendari i resultats · ${BASE_TITLE}`,
    description: 'Calendari, horaris i resultats de tots els partits de la Lleida League, amb fitxa de cada partit: golejadors, targetes i MVP.',
  },
  stats: {
    title: `Golejadors, MVPs i rècords · ${BASE_TITLE}`,
    description: 'Pitxitxi, assistents i MVPs de la Lleida League, rècords de la lliga, el quintet ideal de cada jornada i un comparador de jugadors i equips.',
  },
  gallery: {
    title: `Galeria de fotos i vídeos · ${BASE_TITLE}`,
    description: 'Fotos i vídeos de la Lleida League: els millors moments de cada jornada i els resums dels partits.',
  },
  club: {
    title: `Descobreix-nos: història, palmarès i Lleidalitos · ${BASE_TITLE}`,
    description: 'Qui som, palmarès de campions, La nostra grada, col·laboradors, àrbitres i la moneda virtual (Lleidalitos) de la Lleida League, el torneig presidencial de futbol sala de Lleida.',
  },
  admin: { title: `Tauler de control · ${BASE_TITLE}`, description: 'Accés d’administració.' },
  live: {
    title: `En directe · ${BASE_TITLE}`,
    description: 'Segueix en directe el partit de la Lleida League que s’està retransmetent: marcador, rellotge, cartes de poder i el vídeo.',
  },
  vote: {
    title: `Vota l’MVP · ${BASE_TITLE}`,
    description: 'Vota el millor jugador del partit de la Lleida League que s’està jugant i segueix els resultats en directe.',
  },
};

function setMeta(selector: string, attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

/** Keeps the tab title, description, canonical URL and social tags in sync with the current page. */
export function useDocumentMeta(route: RouteId) {
  useEffect(() => {
    const meta = META[route];
    const path = ALL_ROUTES.find((r) => r.id === route)?.path ?? '/';
    const url = `${window.location.origin}${path === '/' ? '/' : path}`;

    document.title = meta.title;
    setMeta('meta[name="description"]', 'name', 'description', meta.description);
    setMeta('meta[property="og:title"]', 'property', 'og:title', meta.title);
    setMeta('meta[property="og:description"]', 'property', 'og:description', meta.description);
    setMeta('meta[property="og:url"]', 'property', 'og:url', url);
    setMeta('meta[name="twitter:title"]', 'name', 'twitter:title', meta.title);
    setMeta('meta[name="twitter:description"]', 'name', 'twitter:description', meta.description);
    setMeta('meta[name="robots"]', 'name', 'robots', route === 'admin' ? 'noindex,nofollow' : 'index,follow');

    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = url;
  }, [route]);
}
