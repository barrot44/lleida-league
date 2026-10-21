import { Suspense, lazy } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { MobileNav } from '@/components/layout/MobileNav';
import { CategorySwitcher } from '@/components/layout/CategorySwitcher';
import { GlobalModals } from '@/components/layout/GlobalModals';
import { Toaster } from '@/components/ui/Toaster';
import { useRoute } from '@/hooks/useHashRoute';
import { useRemoteSync } from '@/hooks/useRemoteSync';
import HomePage from '@/pages/HomePage';
import StandingsPage from '@/pages/StandingsPage';
import CalendarPage from '@/pages/CalendarPage';
import StatsPage from '@/pages/StatsPage';
import GalleryPage from '@/pages/GalleryPage';

// The back-office is only needed by admins, so it ships as its own chunk.
const AdminPage = lazy(() => import('@/pages/AdminPage'));

function PageFallback() {
  return (
    <div className="grid min-h-[50vh] place-items-center">
      <span className="h-10 w-10 animate-spin rounded-full border-4 border-white/10 border-t-amber-400" aria-label="Cargando" />
    </div>
  );
}

export default function App() {
  const route = useRoute();
  const sync = useRemoteSync();

  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#contenido" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-xl focus:bg-amber-400 focus:px-4 focus:py-2 focus:text-slate-950">
        Saltar al contenido
      </a>
      <Header route={route} />

      {route !== 'admin' && (
        <div className="mx-auto w-full max-w-7xl px-4 pt-4 sm:px-6">
          <CategorySwitcher className="w-full sm:w-fit" />
        </div>
      )}

      <AnimatePresence mode="wait" initial={false}>
        <motion.main
          id="contenido"
          key={route}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.28 }}
          className="flex-1"
        >
          {route === 'home' && <HomePage />}
          {route === 'standings' && <StandingsPage />}
          {route === 'calendar' && <CalendarPage />}
          {route === 'stats' && <StatsPage />}
          {route === 'gallery' && <GalleryPage />}
          {route === 'admin' && (
            <Suspense fallback={<PageFallback />}>
              <AdminPage sync={sync} />
            </Suspense>
          )}
        </motion.main>
      </AnimatePresence>

      <Footer />
      <MobileNav route={route} />
      <GlobalModals />
      <Toaster />
    </div>
  );
}
