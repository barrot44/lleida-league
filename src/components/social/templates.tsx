import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import type { CategoryMeta, Match, Player, Position, Team } from '@/types';
import type { StandingRow } from '@/lib/standings';
import type { QuintetSlot } from '@/lib/quintet';
import { Logo } from '@/components/ui/Logo';
import { PlayerAvatar } from '@/components/ui/PlayerAvatar';
import { PlayerCard } from '@/components/ui/PlayerCard';
import { TeamCrest } from '@/components/ui/TeamCrest';
import { POSITION_LABEL, SITE } from '@/config/site';
import { formatDay } from '@/lib/utils';

export type SocialFormat = 'post' | 'story' | 'square';

export const FORMATS: Record<SocialFormat, { label: string; width: number; height: number; hint: string }> = {
  post: { label: 'Post d’Instagram (4:5)', width: 1080, height: 1350, hint: '1080 × 1350' },
  story: { label: 'Story / TikTok / Reel (9:16)', width: 1080, height: 1920, hint: '1080 × 1920' },
  square: { label: 'Quadrat (1:1)', width: 1080, height: 1080, hint: '1080 × 1080' },
};

const FONT = "'Barlow Semi Condensed', Impact, system-ui, sans-serif";
const GOLD = '#fde68a';
const MUTED = '#94a3b8';

/**
 * Scales its content down (never up) so it always fits the available area — long team names, many rows or
 * a very tall story can no longer spill over the header/footer.
 */
function FitBox({ children }: { children: ReactNode }) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const o = outer.current;
    const i = inner.current;
    if (!o || !i) return;
    const fit = () => {
      const k = Math.min(1, o.clientHeight / Math.max(1, i.scrollHeight), o.clientWidth / Math.max(1, i.scrollWidth));
      setScale((prev) => (Math.abs(prev - k) > 0.001 ? k : prev));
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(i);
    void document.fonts?.ready.then(fit);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={outer} style={{ position: 'relative', flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', margin: '18px 0' }}>
      <div ref={inner} style={{ width: '100%', transform: `scale(${scale})`, transformOrigin: 'center center' }}>
        {children}
      </div>
    </div>
  );
}

interface FrameProps {
  format: SocialFormat;
  category: CategoryMeta;
  title: string;
  subtitle?: string;
  children: ReactNode;
}

/** Common artwork: league header, neon background and footer with the social handle. */
function Frame({ format, category, title, subtitle, children }: FrameProps) {
  const { width, height } = FORMATS[format];
  const tall = height > 1500;
  return (
    <div
      data-artwork="true"
      style={{
        width,
        height,
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        padding: tall ? '84px 64px 72px' : '56px 64px 44px',
        boxSizing: 'border-box',
        fontFamily: FONT,
        color: '#fff',
        background: `radial-gradient(900px 700px at 90% -8%, ${category.accent}55, transparent 62%), radial-gradient(800px 600px at -12% 104%, rgba(6,182,212,.30), transparent 60%), linear-gradient(180deg,#0b1020 0%,#05070c 100%)`,
      }}
    >
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          opacity: 0.07,
          backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
          backgroundSize: '54px 54px',
        }}
      />

      <header style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 22 }}>
        <Logo size={92} />
        <div style={{ flex: 1, minWidth: 0, lineHeight: 1 }}>
          <div style={{ fontSize: 52, fontWeight: 900, letterSpacing: 1, textTransform: 'uppercase', color: GOLD, textShadow: '0 0 24px rgba(251,191,36,.55)', whiteSpace: 'nowrap' }}>Lleida League</div>
          <div style={{ marginTop: 8, fontSize: 19, fontWeight: 600, letterSpacing: 3, textTransform: 'uppercase', color: MUTED, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{SITE.tagline}</div>
        </div>
        <div
          style={{
            flexShrink: 0,
            padding: '10px 22px',
            borderRadius: 999,
            fontSize: 26,
            fontWeight: 900,
            letterSpacing: 3,
            textTransform: 'uppercase',
            color: '#05070c',
            background: category.accent,
            boxShadow: `0 0 30px ${category.accent}88`,
          }}
        >
          {category.short}
        </div>
      </header>

      <div style={{ position: 'relative', zIndex: 1, marginTop: tall ? 60 : 36 }}>
        <div style={{ fontSize: tall ? 104 : 92, lineHeight: 0.95, fontWeight: 900, textTransform: 'uppercase', letterSpacing: -1 }}>{title}</div>
        {subtitle && <div style={{ marginTop: 14, fontSize: 32, fontWeight: 700, letterSpacing: 4, textTransform: 'uppercase', color: category.accent }}>{subtitle}</div>}
      </div>

      <div style={{ position: 'relative', zIndex: 1, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <FitBox>{children}</FitBox>
      </div>

      <footer style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20, paddingTop: 22, borderTop: '2px solid rgba(255,255,255,.12)' }}>
        <div style={{ fontSize: 34, fontWeight: 900, letterSpacing: 2, color: GOLD }}>{SITE.handle}</div>
        <div style={{ fontSize: 24, fontWeight: 600, letterSpacing: 3, textTransform: 'uppercase', color: MUTED, whiteSpace: 'nowrap' }}>{SITE.hashtags.join('  ')}</div>
      </footer>
    </div>
  );
}

const scoreBox = (size: number, live = false): CSSProperties => ({
  fontSize: size,
  fontWeight: 900,
  lineHeight: 1,
  padding: `${size * 0.1}px ${size * 0.26}px`,
  borderRadius: size * 0.2,
  letterSpacing: 2,
  fontVariantNumeric: 'tabular-nums',
  background: live ? 'rgba(239,68,68,.18)' : 'rgba(0,0,0,.45)',
  border: `3px solid ${live ? 'rgba(239,68,68,.6)' : 'rgba(251,191,36,.35)'}`,
  color: live ? '#fecaca' : GOLD,
  whiteSpace: 'nowrap',
});

const teamName = (size: number): CSSProperties => ({
  fontSize: size,
  fontWeight: 900,
  textTransform: 'uppercase',
  lineHeight: 1.04,
  overflowWrap: 'anywhere',
});

// ───────────────────────── 1) Resultat d'un partit ─────────────────────────

interface MatchResultProps {
  format: SocialFormat;
  category: CategoryMeta;
  match: Match;
  home: Team;
  away: Team;
  mvp?: Player;
}

const goalsFor = (match: Match, teamId: string) =>
  match.events.filter((e) => (e.type === 'goal' && e.teamId === teamId) || (e.type === 'own_goal' && e.teamId !== teamId));

export function MatchResultTemplate({ format, category, match, home, away, mvp }: MatchResultProps) {
  const live = match.status === 'live';
  const started = match.status !== 'scheduled';
  const tall = FORMATS[format].height > 1500;
  const crest = format === 'square' ? 190 : 240;
  const scoreText = started ? `${match.homeScore ?? 0} - ${match.awayScore ?? 0}` : 'VS';
  const scoreSize = scoreText.length > 6 ? 96 : format === 'square' ? 118 : 140;
  const homeGoals = goalsFor(match, home.id);
  const awayGoals = goalsFor(match, away.id);
  const maxGoalLines = tall ? 10 : format === 'square' ? 4 : 7;

  const goalList = (list: ReturnType<typeof goalsFor>, align: 'left' | 'right') => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, textAlign: align, fontSize: 30, fontWeight: 600, color: '#cbd5e1', minWidth: 0 }}>
      {list.slice(0, maxGoalLines).map((e) => (
        <div key={e.id} style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {align === 'right' ? (
            <>
              {e.playerName}
              {e.type === 'own_goal' ? ' (p.p.)' : ''} <b style={{ color: GOLD }}>{e.minute}'</b> ⚽
            </>
          ) : (
            <>
              ⚽ <b style={{ color: GOLD }}>{e.minute}'</b> {e.playerName}
              {e.type === 'own_goal' ? ' (p.p.)' : ''}
            </>
          )}
        </div>
      ))}
      {list.length > maxGoalLines && <div style={{ color: MUTED }}>+{list.length - maxGoalLines} més</div>}
    </div>
  );

  const side = (team: Team) => (
    <div style={{ textAlign: 'center', minWidth: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'center', filter: `drop-shadow(0 18px 40px ${team.primaryColor}99)` }}>
        <TeamCrest team={team} size={crest} />
      </div>
      <div style={{ ...teamName(38), marginTop: 16 }}>{team.name}</div>
    </div>
  );

  return (
    <Frame format={format} category={category} title={live ? 'En directe' : started ? 'Resultat final' : 'Proper partit'} subtitle={`Jornada ${match.matchday} · ${formatDay(match.date)} · ${match.time}h`}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: tall ? 70 : 38 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto minmax(0,1fr)', alignItems: 'center', gap: 22 }}>
          {side(home)}
          <div style={scoreBox(scoreSize, live)}>{scoreText}</div>
          {side(away)}
        </div>

        {started && (homeGoals.length > 0 || awayGoals.length > 0) && (
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 2px minmax(0,1fr)', gap: 36 }}>
            {goalList(homeGoals, 'right')}
            <div style={{ background: 'rgba(255,255,255,.15)' }} />
            {goalList(awayGoals, 'left')}
          </div>
        )}

        {mvp && (
          <div style={{ alignSelf: 'center', maxWidth: '100%', display: 'flex', alignItems: 'center', gap: 22, padding: '14px 34px 14px 14px', borderRadius: 999, background: 'rgba(251,191,36,.14)', border: '3px solid rgba(251,191,36,.55)' }}>
            <PlayerAvatar player={mvp} team={mvp.teamId === home.id ? home : away} size={96} />
            <div style={{ lineHeight: 1.05, minWidth: 0 }}>
              <div style={{ fontSize: 24, fontWeight: 900, letterSpacing: 4, color: GOLD }}>★ MVP DEL PARTIT</div>
              <div style={{ fontSize: 46, fontWeight: 900, textTransform: 'uppercase', overflowWrap: 'anywhere' }}>{mvp.name}</div>
            </div>
          </div>
        )}

        {!started && <div style={{ textAlign: 'center', fontSize: 34, fontWeight: 600, color: MUTED }}>📍 {match.venue}</div>}
      </div>
    </Frame>
  );
}

// ───────────────────────── 2) Resum / cartell de jornada ─────────────────────────

interface MatchListProps {
  format: SocialFormat;
  category: CategoryMeta;
  matchday: number;
  matches: { match: Match; home: Team; away: Team }[];
  mode: 'results' | 'fixtures';
}

export function MatchListTemplate({ format, category, matchday, matches, mode }: MatchListProps) {
  const n = Math.max(1, matches.length);
  const big = n <= 4;
  const crest = big ? 88 : n <= 6 ? 70 : 58;
  const nameSize = big ? 38 : 31;
  const subtitle = mode === 'results' ? 'Resultats' : 'Cartell de la jornada';

  // Square posts have little height: two columns with short codes keep everything large and readable.
  if (format === 'square' && n > 4) {
    return (
      <Frame format={format} category={category} title={`Jornada ${matchday}`} subtitle={subtitle}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {matches.map(({ match, home, away }) => {
            const started = match.status !== 'scheduled';
            const live = match.status === 'live';
            return (
              <div
                key={match.id}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '12px 16px', borderRadius: 22, background: 'rgba(15,23,42,.72)', border: `2px solid ${live ? 'rgba(239,68,68,.6)' : 'rgba(255,255,255,.1)'}` }}
              >
                <TeamCrest team={home} size={52} />
                <span style={{ fontSize: 34, fontWeight: 900 }}>{home.shortName}</span>
                {started || mode === 'results' ? (
                  <div style={scoreBox(42, live)}>{started ? `${match.homeScore ?? 0}-${match.awayScore ?? 0}` : '–'}</div>
                ) : (
                  <div style={{ lineHeight: 1, textAlign: 'center' }}>
                    <div style={{ fontSize: 42, fontWeight: 900, color: GOLD }}>{match.time}</div>
                    <div style={{ marginTop: 4, fontSize: 18, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: '#67e8f9', whiteSpace: 'nowrap' }}>{formatDay(match.date)}</div>
                  </div>
                )}
                <span style={{ fontSize: 34, fontWeight: 900 }}>{away.shortName}</span>
                <TeamCrest team={away} size={52} />
              </div>
            );
          })}
        </div>
      </Frame>
    );
  }

  return (
    <Frame format={format} category={category} title={`Jornada ${matchday}`} subtitle={subtitle}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: big ? 20 : 12 }}>
        {matches.map(({ match, home, away }) => {
          const started = match.status !== 'scheduled';
          const live = match.status === 'live';
          return (
            <div
              key={match.id}
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0,1fr) auto minmax(0,1fr)',
                alignItems: 'center',
                gap: 20,
                padding: big ? '20px 28px' : '12px 24px',
                borderRadius: 26,
                background: 'rgba(15,23,42,.72)',
                border: `2px solid ${live ? 'rgba(239,68,68,.6)' : 'rgba(255,255,255,.1)'}`,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 16, minWidth: 0 }}>
                <span style={{ ...teamName(nameSize), textAlign: 'right' }}>{home.name}</span>
                <TeamCrest team={home} size={crest} />
              </div>
              <div style={{ minWidth: big ? 210 : 176, textAlign: 'center' }}>
                {started || mode === 'results' ? (
                  <div style={scoreBox(big ? 80 : 56, live)}>{started ? `${match.homeScore ?? 0} - ${match.awayScore ?? 0}` : '– –'}</div>
                ) : (
                  <div style={{ lineHeight: 1 }}>
                    <div style={{ fontSize: big ? 80 : 56, fontWeight: 900, color: GOLD }}>{match.time}</div>
                    <div style={{ marginTop: 6, fontSize: big ? 26 : 21, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: '#67e8f9', whiteSpace: 'nowrap' }}>{formatDay(match.date)}</div>
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, minWidth: 0 }}>
                <TeamCrest team={away} size={crest} />
                <span style={teamName(nameSize)}>{away.name}</span>
              </div>
            </div>
          );
        })}
      </div>
    </Frame>
  );
}

// ───────────────────────── 3) Classificació ─────────────────────────

interface StandingsProps {
  format: SocialFormat;
  category: CategoryMeta;
  rows: StandingRow[];
}

export function StandingsTemplate({ format, category, rows: allRows }: StandingsProps) {
  const rows = format === 'square' ? allRows.slice(0, 6) : allRows;
  const n = Math.max(1, rows.length);
  const rowH = n <= 6 ? 96 : n <= 8 ? 82 : 72;
  const cols = '64px minmax(0,1fr) 80px 96px 120px';
  const th: CSSProperties = { fontSize: 24, fontWeight: 800, letterSpacing: 3, color: MUTED, textAlign: 'center' };
  return (
    <Frame format={format} category={category} title="Classificació" subtitle={category.label}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'grid', gridTemplateColumns: cols, alignItems: 'center', padding: '0 24px' }}>
          <span style={th}>#</span>
          <span style={{ ...th, textAlign: 'left' }}>EQUIP</span>
          <span style={th}>PJ</span>
          <span style={th}>DG</span>
          <span style={{ ...th, color: GOLD }}>PTS</span>
        </div>
        {rows.map((r) => {
          const leader = r.position === 1;
          const playoff = category.playoffSpots > 1 && r.position <= category.playoffSpots;
          return (
            <div
              key={r.team.id}
              style={{
                display: 'grid',
                gridTemplateColumns: cols,
                alignItems: 'center',
                minHeight: rowH,
                padding: '4px 24px',
                borderRadius: 22,
                background: leader ? 'rgba(251,191,36,.16)' : 'rgba(15,23,42,.72)',
                border: `2px solid ${leader ? 'rgba(251,191,36,.6)' : playoff ? 'rgba(16,185,129,.45)' : 'rgba(255,255,255,.09)'}`,
              }}
            >
              <span style={{ textAlign: 'center', fontSize: 40, fontWeight: 900, color: leader ? GOLD : '#fff' }}>{r.position}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 16, minWidth: 0 }}>
                <TeamCrest team={r.team} size={rowH - 30} />
                <span style={{ ...teamName(rows.length > 8 ? 30 : 34), minWidth: 0 }}>{r.team.name}</span>
              </span>
              <span style={{ textAlign: 'center', fontSize: 34, fontWeight: 700, color: '#cbd5e1' }}>{r.played}</span>
              <span style={{ textAlign: 'center', fontSize: 34, fontWeight: 700, color: r.goalDiff >= 0 ? '#6ee7b7' : '#fca5a5' }}>{r.goalDiff > 0 ? `+${r.goalDiff}` : r.goalDiff}</span>
              <span style={{ textAlign: 'center', fontSize: 56, fontWeight: 900, color: GOLD }}>{r.points}</span>
            </div>
          );
        })}
      </div>
    </Frame>
  );
}

// ───────────────────────── 4) Golejadors ─────────────────────────

interface ScorersProps {
  format: SocialFormat;
  category: CategoryMeta;
  entries: { player: Player; team?: Team }[];
}

export function ScorersTemplate({ format, category, entries: allEntries }: ScorersProps) {
  const [first, ...rest] = format === 'square' ? allEntries.slice(0, 4) : allEntries;
  return (
    <Frame format={format} category={category} title="Pitxitxi" subtitle="Màxims golejadors">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {first && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 30, padding: '26px 32px', borderRadius: 32, background: 'linear-gradient(135deg, rgba(251,191,36,.28), rgba(251,191,36,.06))', border: '3px solid rgba(251,191,36,.65)' }}>
            <PlayerAvatar player={first.player} team={first.team} size={200} className="ring-4 ring-amber-400" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: 5, color: GOLD }}>👑 LÍDER</div>
              <div style={{ fontSize: 60, fontWeight: 900, textTransform: 'uppercase', lineHeight: 1, overflowWrap: 'anywhere' }}>{first.player.name}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 10, fontSize: 30, fontWeight: 700, color: '#cbd5e1' }}>
                {first.team && <TeamCrest team={first.team} size={42} />} <span style={{ minWidth: 0, overflowWrap: 'anywhere' }}>{first.team?.name}</span>
              </div>
            </div>
            <div style={{ textAlign: 'center', lineHeight: 0.9, flexShrink: 0 }}>
              <div style={{ fontSize: 160, fontWeight: 900, color: GOLD }}>{first.player.stats.goals}</div>
              <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: 4, color: MUTED }}>GOLS</div>
            </div>
          </div>
        )}
        {rest.map(({ player, team }, i) => (
          <div key={player.id} style={{ display: 'flex', alignItems: 'center', gap: 24, padding: '14px 28px', borderRadius: 24, background: 'rgba(15,23,42,.72)', border: '2px solid rgba(255,255,255,.1)' }}>
            <span style={{ width: 52, textAlign: 'center', fontSize: 46, fontWeight: 900, color: MUTED, flexShrink: 0 }}>{i + 2}</span>
            <PlayerAvatar player={player} team={team} size={92} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 40, fontWeight: 900, textTransform: 'uppercase', lineHeight: 1.05, overflowWrap: 'anywhere' }}>{player.name}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 26, fontWeight: 600, color: MUTED }}>
                {team && <TeamCrest team={team} size={28} />} <span style={{ minWidth: 0 }}>{team?.name}</span>
              </div>
            </div>
            <span style={{ fontSize: 80, fontWeight: 900, color: GOLD, flexShrink: 0 }}>{player.stats.goals}</span>
          </div>
        ))}
      </div>
    </Frame>
  );
}

// ───────────────────────── 5) MVP ─────────────────────────

interface MvpProps {
  format: SocialFormat;
  category: CategoryMeta;
  player: Player;
  team?: Team;
  label: string;
}

export function MvpTemplate({ format, category, player, team, label }: MvpProps) {
  const size = format === 'story' ? 760 : format === 'square' ? 520 : 620;
  return (
    <Frame format={format} category={category} title="MVP" subtitle={label}>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <div style={{ filter: `drop-shadow(0 30px 70px ${team?.primaryColor ?? category.accent}aa)` }}>
          <PlayerCard player={player} team={team} size={size} tilt={false} ribbon="MVP" />
        </div>
      </div>
    </Frame>
  );
}

// ───────────────────────── 6) Quintet ideal ─────────────────────────

interface QuintetProps {
  format: SocialFormat;
  category: CategoryMeta;
  slots: QuintetSlot[];
  label: string;
}

/** Top-left anchors (% of the pitch). Cards are ~250px tall, so rows are spaced to never overlap. */
const SLOT_POS: Record<Position, { x: number; y: number }[]> = {
  Pívot: [{ x: 50, y: 3 }],
  Ala: [
    { x: 19, y: 25 },
    { x: 81, y: 25 },
  ],
  Cierre: [{ x: 50, y: 47 }],
  Portero: [{ x: 50, y: 73 }],
};

export function QuintetTemplate({ format, category, slots, label }: QuintetProps) {
  const counters: Partial<Record<Position, number>> = {};
  const height = format === 'story' ? 1360 : format === 'square' ? 880 : 1000;
  const avatar = format === 'square' ? 120 : 140;
  return (
    <Frame format={format} category={category} title="Quintet ideal" subtitle={label}>
      <div
        style={{
          position: 'relative',
          height,
          borderRadius: 36,
          border: '3px solid rgba(255,255,255,.22)',
          background: 'linear-gradient(180deg, rgba(16,185,129,.22), rgba(4,47,46,.55))',
          overflow: 'hidden',
        }}
      >
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} aria-hidden>
          <g fill="none" stroke="rgba(255,255,255,.28)" strokeWidth="0.35">
            <rect x="3" y="3" width="94" height="94" rx="1.5" />
            <path d="M3 50h94" />
            <circle cx="50" cy="50" r="10" />
            <path d="M32 3v14a18 18 0 0 0 36 0V3" />
            <path d="M32 97V83a18 18 0 0 1 36 0v14" />
          </g>
        </svg>
        {slots.map((slot) => {
          const idx = counters[slot.role] ?? 0;
          counters[slot.role] = idx + 1;
          const pos = SLOT_POS[slot.role][idx] ?? SLOT_POS[slot.role][0];
          return (
            <div key={slot.player.id} style={{ position: 'absolute', left: `${pos.x}%`, top: `${pos.y}%`, transform: 'translateX(-50%)', width: 290, textAlign: 'center' }}>
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <PlayerAvatar player={slot.player} team={slot.team} size={avatar} className="ring-4 ring-amber-400" />
                <span style={{ position: 'absolute', right: -14, top: -8, padding: '2px 12px', borderRadius: 999, background: GOLD, color: '#05070c', fontSize: 28, fontWeight: 900 }}>{slot.points}</span>
              </div>
              <div style={{ marginTop: 8, fontSize: 32, fontWeight: 900, textTransform: 'uppercase', lineHeight: 1.02, textShadow: '0 2px 10px rgba(0,0,0,.8)', overflowWrap: 'anywhere' }}>{slot.player.name}</div>
              <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 24, fontWeight: 700, color: '#d1fae5', textShadow: '0 2px 8px rgba(0,0,0,.8)' }}>
                {slot.team && <TeamCrest team={slot.team} size={26} />} {POSITION_LABEL[slot.role]}
              </div>
            </div>
          );
        })}
      </div>
    </Frame>
  );
}
