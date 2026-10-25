import { forwardRef, useMemo, useState, type CSSProperties } from 'react';
import type { Player, Team } from '@/types';

/** Only what the card shows of a team (works with the overlay's team snapshots too). */
export type CardTeam = Pick<Team, 'name' | 'shortName' | 'primaryColor' | 'secondaryColor' | 'logoUrl'> & { presidentName?: string };
import { POSITION_LABEL, POSITION_SHORT } from '@/config/site';
import { playerRating } from '@/lib/standings';
import { artOf, attributesOf, EDITION_LABEL, EDITION_STYLE, serialOf, type Edition } from '@/lib/cardArt';
import { Logo } from '@/components/ui/Logo';
import { PlayerAvatar } from '@/components/ui/PlayerAvatar';
import { TeamCrest } from '@/components/ui/TeamCrest';
import { TiltCard } from '@/components/ui/TiltCard';

/** Chamfered silhouette with a little notch on top: the Lleida League card shape. */
const SHAPE = 'polygon(9% 0, 44% 0, 50% 1.7%, 56% 0, 91% 0, 100% 6%, 100% 94%, 91% 100%, 9% 100%, 0 94%, 0 6%)';
const EDITION_ICON: Record<Edition, string> = { bronze: '', plata: '', or: '★', llegenda: '★★', pitxitxi: '🔥', mvp: '👑' };

interface Props {
  player: Player;
  team?: CardTeam;
  edition: Edition;
  /** Card width in px; everything inside is in `em`, so it scales perfectly. */
  size?: number;
  tilt?: boolean;
  /** Tap to see the back. */
  flippable?: boolean;
  className?: string;
}

function Radar({ values, color }: { values: number[]; color: string }) {
  const n = values.length;
  const pt = (i: number, r: number) => {
    const a = -Math.PI / 2 + (i / n) * Math.PI * 2;
    return `${(50 + Math.cos(a) * r).toFixed(1)},${(50 + Math.sin(a) * r).toFixed(1)}`;
  };
  const shape = values.map((v, i) => pt(i, ((v - 30) / 69) * 44)).join(' ');
  return (
    <svg viewBox="0 0 100 100" className="h-full w-full overflow-visible">
      {[44, 30, 16].map((r) => (
        <polygon key={r} points={values.map((_, i) => pt(i, r)).join(' ')} fill="none" stroke="rgba(255,255,255,.18)" strokeWidth="1" />
      ))}
      {values.map((_, i) => (
        <line key={i} x1="50" y1="50" x2={pt(i, 44).split(',')[0]} y2={pt(i, 44).split(',')[1]} stroke="rgba(255,255,255,.12)" strokeWidth="0.8" />
      ))}
      <polygon points={shape} fill={color} fillOpacity="0.45" stroke={color} strokeWidth="2.2" strokeLinejoin="round" />
      {values.map((v, i) => {
        const [x, y] = pt(i, ((v - 30) / 69) * 44).split(',');
        return <circle key={i} cx={x} cy={y} r="2.6" fill="#fff" />;
      })}
    </svg>
  );
}

function Art({ id, primary, secondary }: { id: string; primary: string; secondary: string }) {
  const art = useMemo(() => artOf(id), [id]);
  return (
    <svg viewBox="0 0 200 300" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
      {art.shards.map((s, i) => (
        <path key={i} d={s.d} fill={i % 2 ? primary : secondary} opacity={s.o} />
      ))}
      {art.rings.map((d, i) => (
        <path key={i} d={d} fill="none" stroke={primary} strokeOpacity={0.22 - i * 0.015} strokeWidth="0.9" />
      ))}
    </svg>
  );
}

function Sigil({ id, color, className, style }: { id: string; color: string; className?: string; style?: CSSProperties }) {
  const { stars } = useMemo(() => artOf(id), [id]);
  return (
    <svg viewBox="0 0 100 100" className={className} style={style}>
      <circle cx="50" cy="50" r="47" fill="none" stroke={color} strokeOpacity=".35" strokeWidth="1.2" strokeDasharray="2 3" />
      <polyline points={stars.map((s) => `${s.x},${s.y}`).join(' ')} fill="none" stroke={color} strokeWidth="1.4" strokeOpacity=".9" />
      {stars.map((s, i) => (
        <circle key={i} cx={s.x} cy={s.y} r={i === 0 ? 3.4 : 2.2} fill={i === 0 ? '#fff' : color} />
      ))}
    </svg>
  );
}

/** Frame + inner panel shared by both faces. */
function Shell({ edition, primary, children }: { edition: Edition; primary: string; children: React.ReactNode }) {
  const st = EDITION_STYLE[edition];
  return (
    <div
      className="absolute inset-0"
      style={{
        clipPath: SHAPE,
        background: st.frame,
        backgroundSize: st.foil ? '300% 100%' : undefined,
        animation: st.foil ? 'll-foil 9s linear infinite' : undefined,
        padding: '0.38em',
      }}
    >
      <div
        className="relative h-full w-full overflow-hidden"
        style={{ clipPath: SHAPE, background: `radial-gradient(120% 70% at 80% 8%, ${primary}55, transparent 60%), linear-gradient(172deg, #131c33 0%, #0a0f1d 55%, #05070c 100%)` }}
      >
        {children}
        {/* Holographic foil + glare following the pointer (CSS vars set by TiltCard). */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-20 mix-blend-overlay"
          style={{
            opacity: st.foil ? 0.85 : 0.45,
            background: 'linear-gradient(115deg, transparent 18%, rgba(251,191,36,.55) 32%, rgba(6,182,212,.5) 46%, rgba(236,72,153,.45) 60%, rgba(16,185,129,.4) 72%, transparent 86%)',
            backgroundSize: '260% 260%',
            backgroundPosition: 'var(--mx, 30%) var(--my, 30%)',
          }}
        />
        <div aria-hidden className="pointer-events-none absolute inset-0 z-20" style={{ background: 'radial-gradient(circle at var(--mx, 30%) var(--my, 20%), rgba(255,255,255,.2), transparent 45%)' }} />
      </div>
    </div>
  );
}

const Front = forwardRef<HTMLDivElement, { player: Player; team?: CardTeam; edition: Edition }>(function Front({ player, team, edition }, ref) {
  const st = EDITION_STYLE[edition];
  const primary = team?.primaryColor ?? '#F59E0B';
  const secondary = team?.secondaryColor ?? '#0f172a';
  const rating = playerRating(player);
  const attrs = attributesOf(player);
  const art = useMemo(() => artOf(player.id), [player.id]);

  return (
    <div ref={ref} className="absolute inset-0 font-display text-white" style={{ backfaceVisibility: 'hidden' }}>
      <Shell edition={edition} primary={primary}>
        <Art id={player.id} primary={primary} secondary={secondary} />

        {edition === 'pitxitxi' && (
          <div aria-hidden className="absolute inset-x-0 bottom-0 h-[55%]" style={{ background: 'radial-gradient(60% 70% at 30% 100%, rgba(249,115,22,.55), transparent 70%), radial-gradient(50% 60% at 75% 100%, rgba(220,38,38,.5), transparent 70%)', animation: 'll-flame 1.6s ease-in-out infinite', transformOrigin: 'bottom' }} />
        )}
        {st.foil &&
          art.stars.slice(0, 5).map((s, i) => (
            <span
              key={i}
              aria-hidden
              className="absolute h-[0.9em] w-[0.9em]"
              style={{ left: `${s.x}%`, top: `${s.y * 0.6}%`, background: `conic-gradient(from 45deg, transparent 0 20%, ${st.accent} 20% 30%, transparent 30% 45%, ${st.accent} 45% 55%, transparent 55% 70%, ${st.accent} 70% 80%, transparent 80% 95%, ${st.accent} 95%)`, clipPath: 'polygon(50% 0,60% 40%,100% 50%,60% 60%,50% 100%,40% 60%,0 50%,40% 40%)', animation: `ll-twinkle ${2.4 + i * 0.5}s ease-in-out ${i * 0.7}s infinite` }}
            />
          ))}

        {/* Ghost dorsal */}
        <span aria-hidden className="absolute right-[0.4em] top-[1.6em] text-[11em] font-black leading-none" style={{ color: 'transparent', WebkitTextStroke: `0.02em ${primary}66` }}>
          {player.dorsal}
        </span>

        {/* Portrait with a team-coloured halo */}
        <div className="absolute right-[0.4em] top-[2.6em] h-[14.5em] w-[13.4em]">
          <div className="absolute inset-[8%] rounded-full blur-[1.2em]" style={{ background: `radial-gradient(circle, ${primary}aa, transparent 70%)` }} />
          <div className="absolute inset-0" style={{ WebkitMaskImage: 'radial-gradient(ellipse 62% 72% at 50% 42%, #000 62%, transparent 74%)', maskImage: 'radial-gradient(ellipse 62% 72% at 50% 42%, #000 62%, transparent 74%)' }}>
            <PlayerAvatar player={player} team={team} size={1000} rounded={false} className="!h-full !w-full !rounded-none" />
          </div>
        </div>

        {/* Rating column */}
        <div className="absolute left-[1.3em] top-[1.9em] z-10 flex w-[4.6em] flex-col items-center">
          <span className="text-[4.5em] font-black leading-[0.85]" style={{ backgroundImage: st.ink, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', filter: `drop-shadow(0 0 0.25em ${st.glow})` }}>
            {rating}
          </span>
          <span className="mt-[0.15em] text-[1.25em] font-black tracking-[0.16em]">{POSITION_SHORT[player.position]}</span>
          <span className="my-[0.5em] h-[0.12em] w-[2.6em] rounded-full" style={{ background: st.frame }} />
          {team && <TeamCrest team={team} size={0} className="!h-[2.6em] !w-[2.3em]" />}
          <span className="mt-[0.55em]">
            <Logo size={0} glow={false} className="!h-[2.1em] !w-[2.1em]" />
          </span>
        </div>

        {/* Edition */}
        <span className="absolute right-[1.6em] top-[1.25em] z-10 rounded-full px-[0.7em] py-[0.18em] text-[0.72em] font-black uppercase tracking-[0.22em] text-slate-950" style={{ background: st.frame, backgroundSize: '300% 100%', animation: st.foil ? 'll-foil 6s linear infinite' : undefined }}>
          {EDITION_ICON[edition]} {EDITION_LABEL[edition]}
        </span>

        {/* Name plate */}
        <div className="absolute inset-x-0 top-[17.3em] z-10">
          <div className="mx-[0.9em] py-[0.45em] text-center" style={{ background: `linear-gradient(90deg, transparent, ${primary}cc 18%, ${primary}cc 82%, transparent)`, clipPath: 'polygon(4% 0, 100% 0, 96% 100%, 0 100%)' }}>
            <p className="truncate px-[1em] text-[1.85em] font-black uppercase leading-none tracking-tight" style={{ textShadow: '0 0.08em 0 rgba(0,0,0,.45)' }}>
              {player.name}
            </p>
          </div>
          <p className="mt-[0.35em] truncate text-center text-[0.82em] font-bold uppercase tracking-[0.24em]" style={{ color: st.accent }}>
            {player.nickname ? `«${player.nickname}»` : POSITION_LABEL[player.position]}
          </p>
        </div>

        {/* Radar + attributes */}
        <div className="absolute inset-x-[1.1em] top-[21.2em] z-10 flex items-center gap-[0.6em]">
          <div className="h-[6.6em] w-[6.6em] shrink-0">
            <Radar values={attrs.map((a) => a.value)} color={primary} />
          </div>
          <dl className="grid flex-1 grid-cols-2 gap-x-[0.7em] gap-y-[0.28em]">
            {attrs.map((a) => (
              <div key={a.key} className="flex items-baseline justify-between border-b border-white/10 pb-[0.1em]">
                <dt className="text-[0.72em] font-bold tracking-[0.16em] text-slate-300">{a.key}</dt>
                <dd className="text-[1.25em] font-black leading-none" style={{ color: a.value >= 80 ? st.accent : '#fff' }}>
                  {a.value}
                </dd>
              </div>
            ))}
            <div className="flex items-baseline justify-between border-b border-white/10 pb-[0.1em]">
              <dt className="text-[0.72em] font-bold tracking-[0.16em] text-slate-300">GOLS</dt>
              <dd className="text-[1.25em] font-black leading-none text-white">{player.stats.goals}</dd>
            </div>
          </dl>
        </div>

        {/* Footer: serial, ID bars, dorsal */}
        <div className="absolute inset-x-[1.5em] bottom-[1.05em] z-10 flex items-end justify-between">
          <span className="text-[0.62em] font-bold uppercase tracking-[0.22em] text-slate-400">
            Nº {serialOf(player.id)} · Lleida League
          </span>
          <span className="flex h-[0.9em] items-end gap-[0.07em] opacity-70">
            {art.bars.map((b, i) => (
              <span key={i} className="h-full bg-white" style={{ width: `${b * 0.06}em` }} />
            ))}
          </span>
          <span className="text-[0.95em] font-black text-white">#{player.dorsal}</span>
        </div>
      </Shell>
    </div>
  );
});

function Back({ player, team, edition }: { player: Player; team?: CardTeam; edition: Edition }) {
  const st = EDITION_STYLE[edition];
  const primary = team?.primaryColor ?? '#F59E0B';
  const s = player.stats;
  const rows: [string, string | number][] = [
    ['Equip', team?.name ?? '—'],
    ['President', team?.presidentName || '—'],
    ['Posició', POSITION_LABEL[player.position]],
    ['Partits', s.matchesPlayed],
    ['Gols / Assist.', `${s.goals} / ${s.assists}`],
    ['MVPs', s.mvpAwards],
    ['Targetes', `${s.yellowCards} 🟨 · ${s.redCards} 🟥`],
  ];
  return (
    <div className="absolute inset-0 font-display text-white" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
      <Shell edition={edition} primary={primary}>
        <Art id={`${player.id}-back`} primary={primary} secondary={team?.secondaryColor ?? '#0f172a'} />
        <div className="absolute inset-0 flex flex-col items-center px-[1.6em] pt-[1.6em]">
          <span className="text-[0.7em] font-black uppercase tracking-[0.32em]" style={{ color: st.accent }}>
            Carta única · Edició {EDITION_LABEL[edition]}
          </span>
          <div className="relative mt-[0.8em] h-[8.5em] w-[8.5em]">
            <Sigil id={player.id} color={st.accent} className="absolute inset-0 h-full w-full" />
            <div className="absolute inset-0 grid place-items-center">{team && <TeamCrest team={team} size={0} className="!h-[3.4em] !w-[3em]" />}</div>
          </div>
          <p className="mt-[0.5em] w-full truncate py-[0.08em] text-center text-[1.7em] font-black uppercase leading-[1.15]">{player.name}</p>
          <p className="mt-[0.3em] text-[0.8em] font-bold uppercase tracking-[0.24em] text-slate-400">Dorsal {player.dorsal}</p>
          <dl className="mt-[0.9em] w-full space-y-[0.3em]">
            {rows.map(([k, v]) => (
              <div key={k} className="flex items-baseline justify-between gap-[0.6em] border-b border-white/10 pb-[0.15em]">
                <dt className="text-[0.72em] font-bold uppercase tracking-[0.16em] text-slate-400">{k}</dt>
                <dd className="truncate text-[0.95em] font-black">{v}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-auto mb-[1.2em] flex items-center gap-[0.5em]">
            <Logo size={0} glow={false} className="!h-[1.8em] !w-[1.8em]" />
            <span className="text-[0.66em] font-bold uppercase tracking-[0.24em] text-slate-400">Nº {serialOf(player.id)} · Més que un joc</span>
          </div>
        </div>
      </Shell>
    </div>
  );
}

/** The Lleida League collectible card: unique art per player, editions, radar of attributes and a back side. */
export const LeagueCard = forwardRef<HTMLDivElement, Props>(function LeagueCard({ player, team, edition, size = 300, tilt = true, flippable = false, className }, frontRef) {
  const [flipped, setFlipped] = useState(false);
  const glow = EDITION_STYLE[edition].glow;

  // No filter / clip-path on the 3D chain (they would flatten it and break the flip): the glow lives on an outer wrapper.
  const card = (
    <div
      className="relative"
      style={{ width: size, height: size * 1.5, fontSize: size / 20, transformStyle: 'preserve-3d', transition: 'transform .7s cubic-bezier(.2,.8,.2,1)', transform: flipped ? 'rotateY(180deg)' : undefined }}
    >
      <Front ref={frontRef} player={player} team={team} edition={edition} />
      {flippable && <Back player={player} team={team} edition={edition} />}
    </div>
  );

  const inner = (
    <div style={{ filter: `drop-shadow(0 ${size / 16}px ${size / 9}px ${glow})` }}>
      {tilt ? (
        <TiltCard max={12} holo={false}>
          {card}
        </TiltCard>
      ) : (
        card
      )}
    </div>
  );

  if (!flippable) return <div className={className}>{inner}</div>;
  return (
    <button type="button" className={className} onClick={() => setFlipped((f) => !f)} aria-label={flipped ? 'Mostra la cara de la carta' : 'Gira la carta'} title="Toca per girar la carta">
      {inner}
    </button>
  );
});
