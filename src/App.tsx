import { Suspense, lazy, useEffect, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { MobileNav } from '@/components/layout/MobileNav';
import { CategorySwitcher } from '@/components/layout/CategorySwitcher';
import { GlobalModals } from '@/components/layout/GlobalModals';
import { GateSwitch } from '@/components/gate/GateSwitch';
import { Logo } from '@/components/ui/Logo';
import { Toaster } from '@/components/ui/Toaster';
import { useRoute } from '@/hooks/useHashRoute';
import { useRemoteSync } from '@/hooks/useRemoteSync';
import { useDocumentMeta } from '@/lib/seo';
import { useUiStore } from '@/store/useUiStore';
import HomePage from '@/pages/HomePage';

// Only the home page ships in the first download; every other page is its own small file, fetched when it is opened
// (and prefetched once the browser is idle, so moving around still feels instant).
const pages = {
  standings: () => import('@/pages/StandingsPage'),
  calendar: () => import('@/pages/CalendarPage'),
  stats: () => import('@/pages/StatsPage'),
  gallery: () => import('@/pages/GalleryPage'),
  club: () => import('@/pages/DiscoverPage'),
  vote: () => import('@/pages/VotePage'),
  live: () => import('@/pages/LivePage'),
};
const StandingsPage = lazy(pages.standings);
const CalendarPage = lazy(pages.calendar);
const StatsPage = lazy(pages.stats);
const GalleryPage = lazy(pages.gallery);
const DiscoverPage = lazy(pages.club);
const VotePage = lazy(pages.vote);
const LivePage = lazy(pages.live);

function usePrefetchPages() {
  useEffect(() => {
    const run = () => Object.values(pages).forEach((load) => void load().catch(() => {}));
    // Safari has no requestIdleCallback: a timer does the same job there.
    if (typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(run, { timeout: 4000 });
      return () => window.cancelIdleCallback(id);
    }
    const t = window.setTimeout(run, 2500);
    return () => window.clearTimeout(t);
  }, []);
}

// The back-office is only needed by admins, so it ships as its own chunk.
const AdminPage = lazy(() => import('@/pages/AdminPage'));
// Only presidents use the registration portal.
const RegistrationPage = lazy(() => import('@/pages/RegistrationPage'));

function PageFallback() {
  return (
    <div className="grid min-h-[50vh] place-items-center">
      <span className="h-10 w-10 animate-spin rounded-full border-4 border-white/10 border-t-amber-400" aria-label="Carregant" />
    </div>
  );
}

const page = (el: ReactNode) => <Suspense fallback={<PageFallback />}>{el}</Suspense>;

const admin = (
  <Suspense fallback={<PageFallback />}>
    <AdminPage />
  </Suspense>
);

const registration = (
  <Suspense fallback={<PageFallback />}>
    <RegistrationPage />
  </Suspense>
);

/** Shown only while the shared league data is being read for the first time (Supabase mode). */
function Splash() {
  return (
    <div className="grid min-h-dvh place-items-center">
      <div className="flex flex-col items-center gap-5">
        <Logo size={96} className="animate-float" />
        <span className="h-1.5 w-40 overflow-hidden rounded-full bg-white/10">
          <span className="block h-full w-1/2 animate-shimmer rounded-full bg-gold-gradient bg-[length:200%_100%]" />
        </span>
      </div>
    </div>
  );
}

export default function App() {
  const route = useRoute();
  useRemoteSync();
  useDocumentMeta(route);
  const remoteReady = useUiStore((s) => s.remoteReady);
  usePrefetchPages();

  if (!remoteReady) return <Splash />;

  return (
    <>
      <GateSwitch route={route} adminView={admin} registrationView={registration}>
        <div className="flex min-h-dvh flex-col">
          <a href="#contingut" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-xl focus:bg-amber-400 focus:px-4 focus:py-2 focus:text-slate-950">
            Salta al contingut
          </a>
          <Header route={route} />

          {route !== 'admin' && route !== 'club' && route !== 'vote' && route !== 'live' && route !== 'registration' && (
            <div className="mx-auto w-full max-w-7xl px-4 pt-4 sm:px-6">
              <CategorySwitcher className="w-full sm:w-fit" />
            </div>
          )}

          <AnimatePresence mode="wait" initial={false}>
            <motion.main
              id="contingut"
              key={route}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.28 }}
              className="flex-1"
            >
              {route === 'home' && <HomePage />}
              {route === 'standings' && page(<StandingsPage />)}
              {route === 'calendar' && page(<CalendarPage />)}
              {route === 'stats' && page(<StatsPage />)}
              {route === 'gallery' && page(<GalleryPage />)}
              {route === 'club' && page(<DiscoverPage />)}
              {route === 'vote' && page(<VotePage />)}
              {route === 'live' && page(<LivePage />)}
              {route === 'admin' && admin}
              {route === 'registration' && registration}
            </motion.main>
          </AnimatePresence>

          <Footer />
          <MobileNav route={route} />
          <GlobalModals />
        </div>
      </GateSwitch>
      <Toaster />
    </>
  );
}
