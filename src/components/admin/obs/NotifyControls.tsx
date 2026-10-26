import { useState } from 'react';
import { BellRing, Loader2, Send } from 'lucide-react';
import { sendPush } from '@/lib/push';
import { supabaseEnabled } from '@/lib/supabase';
import { useObsStore } from '@/obs/useObsStore';
import { useUiStore } from '@/store/useUiStore';
import { SectionCard } from '@/components/admin/fields';
import { Toggle } from '@/components/admin/obs/Toggle';
import { autoMessage } from '@/components/admin/obs/autoNotify';
import type { useObsActions } from '@/components/admin/obs/useObsActions';

type Actions = ReturnType<typeof useObsActions>;

const LINKS = [
  { url: '/directe', label: 'Directe' },
  { url: '/vota', label: 'Votació' },
  { url: '/classificacio', label: 'Classificació' },
  { url: '/calendari', label: 'Calendari' },
];

/** Notifications to the phones that installed the app / switched on the alerts on the website. */
export function NotifyControls({ actions }: { actions: Actions }) {
  const state = useObsStore((s) => s.state);
  const toast = useUiStore((s) => s.toast);
  const [msg, setMsg] = useState({ title: '', body: '', url: '/directe' });
  const [busy, setBusy] = useState(false);

  const presets = [
    { label: '🔴 Comença el directe', m: autoMessage('start', state) },
    { label: '📊 Resultat ara', m: state.scoreboard.home && state.scoreboard.away ? { title: `⏱️ ${state.scoreboard.home.shortName} ${state.scoreboard.homeScore}-${state.scoreboard.awayScore} ${state.scoreboard.away.shortName}`, body: 'Segueix el partit en directe.', url: '/directe' } : null },
    { label: '🏁 Final', m: autoMessage('final', state) },
  ].filter((p) => p.m);

  const send = async () => {
    if (!msg.title.trim()) return toast('Escriu el títol de l’avís.', 'error');
    setBusy(true);
    try {
      const r = await sendPush({ title: msg.title.trim(), body: msg.body.trim(), url: msg.url });
      toast(r.total ? `Avís enviat a ${r.sent} de ${r.total} mòbils.` : 'Avís enviat, però encara ningú no té els avisos activats.');
      setMsg((m) => ({ ...m, title: '', body: '' }));
    } catch (e) {
      toast(e instanceof Error ? e.message : 'No s’ha pogut enviar.', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SectionCard
      title="Avisos al mòbil"
      actions={<Toggle small checked={state.notify.auto} onChange={(v) => actions.update((s) => ({ ...s, notify: { ...s.notify, auto: v } }))} label="Automàtics" hint="Inici, gols, final i votacions" />}
    >
      {!supabaseEnabled && <p className="mb-3 rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs text-amber-100">En mode local no es poden enviar avisos: funcionen a la web publicada amb Supabase.</p>}
      {presets.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {presets.map((p) => (
            <button key={p.label} className="rounded-lg border border-white/10 px-2.5 py-1 text-xs font-bold text-slate-300 hover:border-amber-400/50" onClick={() => p.m && setMsg({ title: p.m.title, body: p.m.body ?? '', url: p.m.url ?? '/directe' })}>
              {p.label}
            </button>
          ))}
        </div>
      )}
      <input className="input" value={msg.title} maxLength={80} onChange={(e) => setMsg((m) => ({ ...m, title: e.target.value }))} placeholder="Títol (ex.: 🔴 Comencem en 10 minuts!)" aria-label="Títol de l’avís" />
      <textarea className="input mt-2 min-h-[64px] resize-none" value={msg.body} maxLength={200} onChange={(e) => setMsg((m) => ({ ...m, body: e.target.value }))} placeholder="Text (opcional)" aria-label="Text de l’avís" />
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span className="text-xs text-slate-500">En tocar-lo obre:</span>
        {LINKS.map((l) => (
          <button key={l.url} onClick={() => setMsg((m) => ({ ...m, url: l.url }))} className={`rounded-lg border px-2 py-1 text-xs font-bold ${msg.url === l.url ? 'border-amber-400 bg-amber-400/15 text-amber-200' : 'border-white/10 text-slate-400'}`}>
            {l.label}
          </button>
        ))}
      </div>
      <button className="btn-gold mt-3 w-full" disabled={busy || !msg.title.trim()} onClick={() => void send()}>
        {busy ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Envia l’avís a tothom
      </button>
      <p className="mt-3 flex gap-2 text-[11px] leading-relaxed text-slate-500">
        <BellRing size={14} className="mt-0.5 shrink-0" /> Arriba a qui hagi tocat «Activa els avisos» a la web o a l’app instal·lada (a l’iPhone, cal afegir-la a la pantalla d’inici).
      </p>
    </SectionCard>
  );
}
