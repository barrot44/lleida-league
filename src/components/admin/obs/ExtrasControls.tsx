import { useMemo, useState } from 'react';
import { Clapperboard, EyeOff, Hand, MessageSquareText, Mic, PartyPopper, RefreshCw, Send, Timer } from 'lucide-react';
import type { ObsScreenKind } from '@/obs/types';
import { SCREEN_DEFAULTS, tickerResultLines } from '@/obs/state';
import { useObsStore } from '@/obs/useObsStore';
import { useLeagueStore } from '@/store/useLeagueStore';
import { Field, SectionCard } from '@/components/admin/fields';
import { Toggle } from '@/components/admin/obs/Toggle';
import type { useObsActions } from '@/components/admin/obs/useObsActions';
import { squadOrder } from '@/obs/state';
import { cn, toISODate, toTimeString } from '@/lib/utils';

type Actions = ReturnType<typeof useObsActions>;

// ───────────────────────── Lower third ─────────────────────────

export function LowerThirdControls({ actions }: { actions: Actions }) {
  const lt = useObsStore((s) => s.state.lower);
  const sb = useObsStore((s) => s.state.scoreboard);
  const players = useLeagueStore((s) => s.players);
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [teamId, setTeamId] = useState('');
  const [autoHide, setAutoHide] = useState(10);

  const matchPlayers = useMemo(() => players.filter((p) => p.teamId === sb.home?.id || p.teamId === sb.away?.id).sort(squadOrder), [players, sb.home?.id, sb.away?.id]);

  const fill = (t: string, s: string, team: string) => {
    setTitle(t);
    setSubtitle(s);
    setTeamId(team);
  };

  const presets: { label: string; run: () => void }[] = [];
  if (sb.home && sb.away) {
    const { home, away } = sb;
    presets.push({ label: 'Presentació', run: () => fill(`${home.name} vs ${away.name}`, [sb.matchday ? `Jornada ${sb.matchday}` : '', useObsStore.getState().state.categoryLabel].filter(Boolean).join(' · '), '') });
    if (home.presidentName) presets.push({ label: `President ${home.shortName}`, run: () => fill(home.presidentName!, `President · ${home.name}`, home.id) });
    if (away.presidentName) presets.push({ label: `President ${away.shortName}`, run: () => fill(away.presidentName!, `President · ${away.name}`, away.id) });
  }
  presets.push({ label: 'Comentarista', run: () => fill('', 'Comentarista · Lleida League', '') });
  presets.push({ label: 'Xarxes', run: () => fill('Segueix-nos @lleidaleague', 'Instagram · TikTok · YouTube', '') });

  const visible = lt.visible && (!lt.hideAt || Date.now() < lt.hideAt);

  return (
    <SectionCard
      title="Rètol (lower third)"
      actions={
        <button className="btn-danger !py-2" disabled={!visible} onClick={actions.hideLower}>
          <EyeOff size={15} /> Amaga
        </button>
      }
    >
      <div className="mb-3 flex flex-wrap gap-1.5">
        {presets.map((p) => (
          <button key={p.label} onClick={p.run} className="rounded-lg border border-white/10 px-2.5 py-1 text-xs font-bold text-slate-300 transition hover:border-amber-400/50 hover:text-white">
            <Mic size={11} className="mr-1 inline" />
            {p.label}
          </button>
        ))}
        {matchPlayers.length > 0 && (
          <select
            className="input !w-auto !py-1 text-xs"
            value=""
            onChange={(e) => {
              const p = matchPlayers.find((x) => x.id === e.target.value);
              const team = p && (p.teamId === sb.home?.id ? sb.home : sb.away);
              if (p && team) fill(p.name, `#${p.dorsal} · ${team.name}`, team.id);
            }}
            aria-label="Rètol d’un jugador"
          >
            <option value="">Jugador…</option>
            {matchPlayers.map((p) => (
              <option key={p.id} value={p.id}>
                #{p.dorsal} {p.name}
              </option>
            ))}
          </select>
        )}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Títol">
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Nom o text principal" />
        </Field>
        <Field label="Subtítol">
          <input className="input" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="Càrrec, equip, informació…" />
        </Field>
        <Field label="Escut">
          <select className="input" value={teamId} onChange={(e) => setTeamId(e.target.value)}>
            <option value="">Sense escut</option>
            {sb.home && <option value={sb.home.id}>{sb.home.name}</option>}
            {sb.away && <option value={sb.away.id}>{sb.away.name}</option>}
          </select>
        </Field>
        <Field label="S’amaga sol">
          <select className="input" value={autoHide} onChange={(e) => setAutoHide(Number(e.target.value))}>
            <option value={0}>No (manual)</option>
            <option value={6}>Als 6 s</option>
            <option value={10}>Als 10 s</option>
            <option value={15}>Als 15 s</option>
          </select>
        </Field>
      </div>
      <button className="btn-gold mt-4 w-full" disabled={!title.trim()} onClick={() => actions.showLower(title.trim(), subtitle.trim(), teamId || null, autoHide)}>
        <Send size={15} /> Mostra el rètol
      </button>
    </SectionCard>
  );
}

// ───────────────────────── Ticker ─────────────────────────

export function TickerControls({ actions }: { actions: Actions }) {
  const ticker = useObsStore((s) => s.state.ticker);
  const category = useObsStore((s) => s.state.scoreboard.category);
  const teams = useLeagueStore((s) => s.teams);
  const matches = useLeagueStore((s) => s.matches);
  const [messages, setMessages] = useState('Benvinguts al directe de la Lleida League!\nSegueix-nos a @lleidaleague');
  const [withResults, setWithResults] = useState(true);
  const [label, setLabel] = useState(ticker.label || 'Lleida League');

  const build = () => [...messages.split('\n').map((s) => s.trim()).filter(Boolean), ...(withResults ? tickerResultLines({ teams, matches }, category) : [])];

  const apply = (visible: boolean) => actions.update((s) => ({ ...s, ticker: { visible, label: label.trim() || 'Lleida League', items: build() } }));

  return (
    <SectionCard
      title="Barra inferior"
      actions={<Toggle checked={ticker.visible} onChange={(v) => (v ? apply(true) : actions.update((s) => ({ ...s, ticker: { ...s.ticker, visible: false } })))} label={ticker.visible ? 'En antena' : 'Amagada'} />}
    >
      <div className="grid gap-3 sm:grid-cols-[12rem_1fr]">
        <Field label="Etiqueta">
          <input className="input" value={label} onChange={(e) => setLabel(e.target.value)} />
        </Field>
        <Field label="Missatges (un per línia)">
          <textarea className="input min-h-[84px] resize-y" value={messages} onChange={(e) => setMessages(e.target.value)} />
        </Field>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <Toggle small checked={withResults} onChange={setWithResults} label="Afegeix resultats i pròxims partits de la categoria" />
        <button className="btn-ghost !py-2" onClick={() => apply(true)}>
          <RefreshCw size={14} /> {ticker.visible ? 'Actualitza la barra' : 'Mostra la barra'}
        </button>
      </div>
    </SectionCard>
  );
}

// ───────────────────────── Full screens ─────────────────────────

const SCREENS: { kind: ObsScreenKind; label: string; icon: typeof Timer }[] = [
  { kind: 'starting', label: 'Comencem aviat', icon: Timer },
  { kind: 'brb', label: 'Tornem de seguida', icon: Hand },
  { kind: 'halftime', label: 'Descans', icon: Clapperboard },
  { kind: 'ending', label: 'Final / Gràcies', icon: PartyPopper },
];

export function ScreenControls({ actions }: { actions: Actions }) {
  const screen = useObsStore((s) => s.state.screen);
  const [kind, setKind] = useState<ObsScreenKind>('starting');
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const soon = new Date(Date.now() + 10 * 60_000);
  const [date, setDate] = useState(toISODate(soon));
  const [time, setTime] = useState(toTimeString(soon));

  const targetAt = () => {
    if (kind !== 'starting' || !date || !time) return '';
    const d = new Date(`${date}T${time}:00`);
    return Number.isNaN(d.getTime()) ? '' : d.toISOString();
  };

  return (
    <SectionCard
      title="Pantalles completes"
      actions={
        <button className="btn-danger !py-2" disabled={!screen.visible} onClick={actions.hideScreen}>
          <EyeOff size={15} /> Treu la pantalla
        </button>
      }
    >
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {SCREENS.map(({ kind: k, label, icon: Icon }) => (
          <button
            key={k}
            onClick={() => setKind(k)}
            className={cn('flex flex-col items-center gap-1.5 rounded-2xl border px-2 py-3 text-xs font-black uppercase tracking-wide transition', kind === k ? 'border-amber-400/70 bg-amber-400/10 text-amber-200' : 'border-white/10 text-slate-400 hover:text-white')}
          >
            <Icon size={20} />
            {label}
            {screen.visible && screen.kind === k && <span className="rounded-full bg-red-500 px-1.5 text-[9px] text-white">En antena</span>}
          </button>
        ))}
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Field label="Títol">
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={SCREEN_DEFAULTS[kind].title} />
        </Field>
        <Field label="Subtítol">
          <input className="input" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder={SCREEN_DEFAULTS[kind].subtitle} />
        </Field>
        {kind === 'starting' && (
          <Field label="Compte enrere fins a" className="sm:col-span-2" hint="Buida l’hora per no mostrar compte enrere.">
            <div className="flex gap-2">
              <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
              <input type="time" className="input" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
          </Field>
        )}
      </div>
      <p className="mt-3 text-xs text-slate-500">Tapa tota la imatge (ideal abans de començar, al descans o en acabar). Si hi ha un partit al marcador, també surt.</p>
      <button className="btn-gold mt-3 w-full" onClick={() => actions.showScreen(kind, title.trim(), subtitle.trim(), targetAt())}>
        <Send size={15} /> Posa «{title.trim() || SCREEN_DEFAULTS[kind].title}» en antena
      </button>
    </SectionCard>
  );
}

// ───────────────────────── QR to the website ─────────────────────────

const QR_TARGETS = [
  { path: '/', label: 'Tota la lliga a la web', name: 'Inici de la web' },
  { path: '/vota', label: 'Vota l’MVP!', name: 'Votació MVP' },
  { path: '/classificacio', label: 'Classificació en directe', name: 'Classificació' },
  { path: '/calendari', label: 'Resultats i calendari', name: 'Calendari' },
] as const;

function QrControl({ actions }: { actions: Actions }) {
  const qr = useObsStore((s) => s.state.qr);
  const origin = window.location.origin;
  const current = QR_TARGETS.find((t) => `${origin}${t.path}` === qr.url) ?? QR_TARGETS[0];
  const set = (visible: boolean, target = current) => actions.update((s) => ({ ...s, qr: { visible, url: `${origin}${target.path}`, label: target.label } }));

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <Toggle checked={qr.visible} onChange={(v) => set(v)} label="Codi QR a la cantonada" hint="La gent l’escaneja amb el mòbil i va directa a la web." />
      <select className="input !w-auto !py-1.5 text-xs" value={current.path} onChange={(e) => set(qr.visible, QR_TARGETS.find((t) => t.path === e.target.value) ?? QR_TARGETS[0])} aria-label="On porta el QR">
        {QR_TARGETS.map((t) => (
          <option key={t.path} value={t.path}>
            {t.name}
          </option>
        ))}
      </select>
    </div>
  );
}

// ───────────────────────── Brand & sponsors ─────────────────────────

export function BrandControls({ actions }: { actions: Actions }) {
  const brand = useObsStore((s) => s.state.brand);
  const sponsorsState = useObsStore((s) => s.state.sponsors);
  const sponsors = useLeagueStore((s) => s.sponsors);

  const setSponsors = (visible: boolean, seconds = sponsorsState.seconds) =>
    actions.update((s) => ({ ...s, sponsors: { visible, seconds, items: sponsors.map((x) => ({ name: x.name, logoUrl: x.logoUrl ?? '' })) } }));

  return (
    <SectionCard title="Marca, QR i patrocinadors">
      <div className="space-y-4">
        <Toggle checked={brand.visible} onChange={(v) => actions.update((s) => ({ ...s, brand: { visible: v } }))} label="«Directe» + logo + @lleidaleague" hint="A dalt a la dreta." />
        <Toggle
          checked={sponsorsState.visible}
          onChange={(v) => setSponsors(v)}
          label="Patrocinadors rotatius"
          hint={sponsors.length ? `${sponsors.length} patrocinadors de la pestanya Club.` : 'Afegeix patrocinadors a la pestanya Club.'}
        />
        <QrControl actions={actions} />
        <label className="flex items-center gap-2 text-xs text-slate-400">
          <MessageSquareText size={14} /> Patrocinadors: canvia cada
          <select className="input !w-auto !py-1" value={sponsorsState.seconds} onChange={(e) => setSponsors(sponsorsState.visible, Number(e.target.value))}>
            {[5, 8, 12, 20].map((n) => (
              <option key={n} value={n}>
                {n} s
              </option>
            ))}
          </select>
        </label>
      </div>
    </SectionCard>
  );
}
