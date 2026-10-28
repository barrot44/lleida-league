import { useEffect, useRef, useState } from 'react';
import { Bell, BellOff, BellRing, CheckCircle2, Download, Loader2, MoreVertical, Share, Smartphone } from 'lucide-react';
import { currentSubscription, pushSupported, subscribePush, unsubscribePush } from '@/lib/push';
import { isIos, isStandalone, promptInstall, usePwaStore } from '@/lib/pwa';
import { useUiStore } from '@/store/useUiStore';
import { cn } from '@/lib/utils';

/** Arrived from the QR shown on the stream ("/directe?avisos"): point straight at the button. */
const fromStreamQr = () => new URLSearchParams(window.location.search).has('avisos');

/**
 * "Lleida League on your phone": install the app and switch on the notifications (lives, goals, votes).
 * `launch`: version for the countdown page — add it to the home screen now and get a notification the day the site opens.
 */
export function AppCard({ launch }: { launch?: boolean } = {}) {
  const toast = useUiStore((s) => s.toast);
  const installEvent = usePwaStore((s) => s.installEvent);
  const installed = usePwaStore((s) => s.installed);
  const [subscribed, setSubscribed] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const iosBrowser = isIos() && !isStandalone();
  const canPush = pushSupported();
  // Android / desktop without the browser's own install prompt (or already dismissed): say where the option is.
  const manualInstall = launch && !installed && !installEvent && !isIos() && !isStandalone();
  const ref = useRef<HTMLElement>(null);
  const [spotlight] = useState(fromStreamQr);

  useEffect(() => {
    void currentSubscription().then((s) => setSubscribed(!!s));
  }, []);

  useEffect(() => {
    if (spotlight) window.setTimeout(() => ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 400);
  }, [spotlight]);

  const toggle = async () => {
    setBusy(true);
    try {
      if (subscribed) {
        await unsubscribePush();
        setSubscribed(false);
        toast('Avisos desactivats.', 'info');
        return;
      }
      const res = await subscribePush();
      if (res === 'ok') {
        setSubscribed(true);
        toast(launch ? 'Avisos activats! El dia que obrim t’arribarà una notificació 🚀' : 'Avisos activats! Et direm quan comenci el directe i a cada gol 🔔');
      } else if (res === 'denied') toast('Has bloquejat les notificacions: activa-les a la configuració del navegador.', 'error');
      else if (res === 'unsupported') toast('Aquest navegador no permet avisos.', 'error');
      else toast('No s’han pogut activar els avisos. Torna-ho a provar.', 'error');
    } finally {
      setBusy(false);
    }
  };

  if (installed && subscribed && !launch) return null;

  return (
    <section
      ref={ref}
      className={cn('relative overflow-hidden rounded-3xl border bg-gradient-to-br from-amber-400/[0.12] via-white/[0.02] to-cyan-400/[0.08] p-4 sm:p-5', spotlight ? 'border-amber-400 shadow-glow-lg ring-2 ring-amber-400/40' : 'border-white/10')}
    >
      <div className="flex flex-wrap items-center gap-4">
        <span className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-2xl border border-white/10 bg-pitch shadow-glow">
          <img src="/icons/icon-192.png" alt="" className="h-full w-full object-cover" />
        </span>
        <span className="min-w-0 flex-1 basis-56">
          <span className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.2em] text-amber-300">
            <Smartphone size={13} /> L’app de la Lleida League
          </span>
          <span className="mt-0.5 block font-display text-xl font-black uppercase leading-tight text-white">{launch ? 'Posa-la a la pantalla d’inici' : 'Avisos de directes i gols al mòbil'}</span>
          <span className="mt-1 block text-xs text-slate-400">
            {launch ? 'Activa els avisos i t’enviarem una notificació el dia que obrim la web. Després, també t’avisarem dels directes i dels gols.' : 'T’avisem quan comenci la retransmissió, a cada gol, al final i quan s’obri la votació.'}
          </span>
        </span>
        <span className="flex w-full flex-wrap gap-2 sm:w-auto">
          {installEvent && !installed && (
            <button className="btn-ghost flex-1 sm:flex-none" onClick={() => void promptInstall()}>
              <Download size={16} /> Instal·la-la
            </button>
          )}
          {canPush && !(launch && subscribed) && (
            <button className={subscribed ? 'btn-ghost flex-1 sm:flex-none' : 'btn-gold flex-1 sm:flex-none'} disabled={busy || subscribed === null} onClick={() => void toggle()}>
              {busy ? <Loader2 size={16} className="animate-spin" /> : subscribed ? <BellOff size={16} /> : <BellRing size={16} />}
              {subscribed ? 'Desactiva els avisos' : 'Activa els avisos'}
            </button>
          )}
        </span>
      </div>
      {launch && subscribed && (
        <p className="mt-3 flex items-center gap-2 rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-sm font-bold text-emerald-200">
          <CheckCircle2 size={16} className="shrink-0" /> Avisos activats: el dia que obrim t’arribarà una notificació.
        </p>
      )}
      {manualInstall && (
        <p className="mt-3 flex flex-wrap items-center gap-1.5 rounded-2xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-slate-300">
          <Smartphone size={13} className="text-amber-300" /> Per tenir-la a la pantalla d’inici: menú <MoreVertical size={13} className="inline text-sky-300" /> del navegador → <strong>Afegeix a la pantalla d’inici</strong> (o «Instal·la l’aplicació»).
        </p>
      )}
      {iosBrowser && (
        <p className="mt-3 flex flex-wrap items-center gap-1.5 rounded-2xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-slate-300">
          <Bell size={13} className="text-amber-300" /> A l’iPhone: toca <Share size={13} className="inline text-sky-300" /> <strong>Compartir</strong> → <strong>Afegeix a la pantalla d’inici</strong>, obre l’app des de la icona i activa-hi els avisos.
        </p>
      )}
    </section>
  );
}
