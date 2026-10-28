import type { ReactNode } from 'react';
import { Hourglass, Wrench } from 'lucide-react';
import type { RouteId } from '@/config/nav';
import { SiteGate } from '@/components/gate/SiteGate';
import { hrefFor } from '@/hooks/useHashRoute';
import { useNow } from '@/hooks/useNow';
import { useEffect } from 'react';
import { GATE_LABEL, gateTarget, isGateActive, launchJustHappened, pingLaunch } from '@/lib/gate';
import { useLeagueStore } from '@/store/useLeagueStore';
import { useUiStore } from '@/store/useUiStore';
import type { GateSettings } from '@/types';

/** Floating reminder for signed-in admins: visitors cannot see the site right now. */
function AdminBanner({ gate }: { gate: GateSettings }) {
  const Icon = gate.mode === 'maintenance' ? Wrench : Hourglass;
  return (
    <a
      href={hrefFor('admin')}
      className="fixed inset-x-3 bottom-20 z-[60] flex items-center justify-center gap-2.5 rounded-2xl border border-amber-400/50 bg-amber-400 px-4 py-2.5 text-sm font-bold text-slate-950 shadow-glow-lg transition hover:scale-[1.02] lg:inset-x-auto lg:bottom-4 lg:left-4 lg:justify-start"
    >
      <Icon size={16} className="shrink-0" />
      <span>
        {GATE_LABEL[gate.mode]} actiu: només els administradors veuen la web · <u>Gestiona-ho</u>
      </span>
    </a>
  );
}

/**
 * Decides what a visitor gets: the real site, or the countdown / maintenance screen.
 * Signed-in admins always see the site; `#/admin` stays reachable so they can sign in and switch it off.
 * Only this small component ticks every second, so the rest of the app never re-renders because of the clock.
 */
export function GateSwitch({ route, adminView, registrationView, children }: { route: RouteId; adminView: ReactNode; registrationView: ReactNode; children: ReactNode }) {
  const gate = useLeagueStore((s) => s.settings.gate);
  const unlocked = useUiStore((s) => s.adminUnlocked);
  const timed = gate.mode === 'countdown' && gate.autoOpen && gateTarget(gate) !== null;
  const now = useNow(timed ? 1000 : null);

  // The moment the countdown reaches zero (or the first visit after it), make sure the "we're open" notification goes out.
  const launched = launchJustHappened(gate, now);
  useEffect(() => {
    if (launched !== null) pingLaunch(launched);
  }, [launched]);

  if (!isGateActive(gate, now)) return <>{children}</>;

  if (unlocked) {
    return (
      <>
        {children}
        {route !== 'admin' && <AdminBanner gate={gate} />}
      </>
    );
  }

  // Presidents register their teams before the launch: their portal stays open behind the countdown.
  if (route === 'admin' || route === 'registration') {
    return (
      <div className="min-h-dvh">
        <div className="px-4 pt-4 sm:px-6">
          <a href={hrefFor('home')} className="text-sm font-semibold text-slate-400 transition hover:text-amber-300">
            ← Torna
          </a>
        </div>
        {route === 'admin' ? adminView : registrationView}
      </div>
    );
  }

  return <SiteGate gate={gate} />;
}
