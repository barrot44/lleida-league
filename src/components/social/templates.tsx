import type { CSSProperties, ReactNode } from 'react';
import type { CategoryMeta, Match, Player, Team } from '@/types';
import type { StandingRow } from '@/lib/standings';
import { Logo } from '@/components/ui/Logo';
import { PlayerAvatar } from '@/components/ui/PlayerAvatar';
import { PlayerCard } from '@/components/ui/PlayerCard';
import { TeamCrest } from '@/components/ui/TeamCrest';
import { SITE } from '@/config/site';
import { formatDay } from '@/lib/utils';

export type SocialFormat = 'post' | 'story' | 'square';

export const FORMATS: Record<SocialFormat, { label: string; width: number; height: number; hint: string }> = {
  post: { label: 'Post d’Instagram (4:5)', width: 1080, height: 1350, hint: '1080 × 1350' },
  story: { label: 'Story / TikTok / Reel (9:16)', width: 1080, height: 1920, hint: '1080 × 1920' },
  square: { label: 'Quadrat (1:1)', width: 1080, height: 1080, hint: '1080 × 1080' },
};

const FONT = "'Barlow Semi Condensed', Impact, system-ui, sans-serif";
const GOLD = '#fde68a';

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
      style={{
        width,
        height,
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        padding: tall ? '84px 64px 72px' : '56px 64px 44px',
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

      <header style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 22 }}>
        <Logo size={92} />
        <div style={{ flex: 1, lineHeight: 1 }}>
          <div style={{ fontSize: 52, fontWeight: 900, letterSpacing: 1, textTransform: 'uppercase', color: GOLD, textShadow: '0 0 24px rgba(251,191,36,.55)' }}>Lleida League</div>
          <div style={{ marginTop: 8, fontSize: 22, fontWeight: 600, letterSpacing: 4, textTransform: 'uppercase', color: '#94a3b8' }}>{SITE.tagline}</div>
        </div>
        <div
          style={{
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

      <div style={{ position: 'relative', marginTop: tall ? 64 : 40 }}>
        <div style={{ fontSize: tall ? 104 : 92, lineHeight: 0.95, fontWeight: 900, textTransform: 'uppercase', letterSpacing: -1 }}>{title}</div>
        {subtitle && <div style={{ marginTop: 14, fontSize: 32, fontWeight: 700, letterSpacing: 4, textTransform: 'uppercase', color: category.accent }}>{subtitle}</div>}
      </div>

      <div style={{ position: 'relative', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', marginTop: 24 }}>{children}</div>

      <footer style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 22, borderTop: '2px solid rgba(255,255,255,.12)' }}>
        <div style={{ fontSize: 34, fontWeight: 900, letterSpacing: 2, color: GOLD }}>{SITE.handle}</div>
        <div style={{ fontSize: 24, fontWeight: 600, letterSpacing: 3, textTransform: 'uppercase', color: '#94a3b8' }}>{SITE.hashtags.join('  ')}</div>
      </footer>
    </div>
  );
}

const scoreBox = (size: number, live = false): CSSProperties => ({
  fontSize: size,
  fontWeight: 900,
  lineHeight: 1,
  padding: `${size * 0.1}px ${size * 0.28}px`,
  borderRadius: size * 0.2,
  letterSpacing: 2,
  fontVariantNumeric: 'tabular-nums',
  background: live ? 'rgba(239,68,68,.18)' : 'rgba(0,0,0,.45)',
  border: `3px solid ${live ? 'rgba(239,68,68,.6)' : 'rgba(251,191,36,.35)'}`,
  color: live ? '#fecaca' : GOLD,
  whiteSpace: 'nowrap',
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
  const crest = format === 'square' ? 200 : 250;
  const goalsList = (team: Team, align: 'left' | 'right') => (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, textAlign: align, fontSize: 30, fontWeight: 600, color: '#cbd5e1', minWidth: 0 }}>
      {goalsFor(match, team.id)
        .slice(0, format === 'square' ? 4 : 7)
        .map((e) => (
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
    </div>
  );

  return (
    <Frame format={format} category={category} title={live ? 'En directe' : started ? 'Resultat final' : 'Proper partit'} subtitle={`Jornada ${match.matchday} · ${formatDay(match.date)} · ${match.time}h`}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: tall ? 70 : 36 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ width: 300, textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', filter: `drop-shadow(0 18px 40px ${home.primaryColor}99)` }}>
              <TeamCrest team={home} size={crest} />
            </div>
            <div style={{ marginTop: 16, fontSize: 40, fontWeight: 900, textTransform: 'uppercase', lineHeight: 1.05 }}>{home.name}</div>
          </div>
          <div style={scoreBox(format === 'square' ? 120 : 150, live)}>{started ? `${match.homeScore ?? 0} - ${match.awayScore ?? 0}` : 'VS'}</div>
          <div style={{ width: 300, textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', filter: `drop-shadow(0 18px 40px ${away.primaryColor}99)` }}>
              <TeamCrest team={away} size={crest} />
            </div>
            <div style={{ marginTop: 16, fontSize: 40, fontWeight: 900, textTransform: 'uppercase', lineHeight: 1.05 }}>{away.name}</div>
          </div>
        </div>

        {started && (goalsFor(match, home.id).length > 0 || goalsFor(match, away.id).length > 0) && (
          <div style={{ display: 'flex', gap: 40 }}>
            {goalsList(home, 'right')}
            <div style={{ width: 2, background: 'rgba(255,255,255,.15)' }} />
            {goalsList(away, 'left')}
          </div>
        )}

        {mvp && (
          <div style={{ alignSelf: 'center', display: 'flex', alignItems: 'center', gap: 22, padding: '14px 34px 14px 14px', borderRadius: 999, background: 'rgba(251,191,36,.14)', border: '3px solid rgba(251,191,36,.55)' }}>
            <PlayerAvatar player={mvp} team={mvp.teamId === home.id ? home : away} size={96} />
            <div style={{ lineHeight: 1.05 }}>
              <div style={{ fontSize: 24, fontWeight: 900, letterSpacing: 4, color: GOLD }}>★ MVP DEL PARTIT</div>
              <div style={{ fontSize: 46, fontWeight: 900, textTransform: 'uppercase' }}>{mvp.name}</div>
            </div>
          </div>
        )}

        {!started && <div style={{ textAlign: 'center', fontSize: 34, fontWeight: 600, color: '#94a3b8' }}>📍 {match.venue}</div>}
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
  const crest = big ? 92 : n <= 6 ? 72 : 60;
  const nameSize = big ? 40 : 32;
  return (
    <Frame format={format} category={category} title={mode === 'results' ? `Jornada ${matchday}` : `Jornada ${matchday}`} subtitle={mode === 'results' ? 'Resultats' : 'Cartell de la jornada'}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: big ? 22 : 14 }}>
        {matches.map(({ match, home, away }) => {
          const started = match.status !== 'scheduled';
          const live = match.status === 'live';
          return (
            <div
              key={match.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto 1fr',
                alignItems: 'center',
                gap: 22,
                padding: big ? '22px 30px' : '12px 26px',
                borderRadius: 26,
                background: 'rgba(15,23,42,.72)',
                border: `2px solid ${live ? 'rgba(239,68,68,.6)' : 'rgba(255,255,255,.1)'}`,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 18, minWidth: 0 }}>
                <span style={{ fontSize: nameSize, fontWeight: 900, textTransform: 'uppercase', textAlign: 'right', lineHeight: 1.05, overflow: 'hidden', textOverflow: 'ellipsis' }}>{home.name}</span>
                <TeamCrest team={home} size={crest} />
              </div>
              <div style={{ minWidth: big ? 230 : 190, textAlign: 'center' }}>
                {started || mode === 'results' ? (
                  <div style={scoreBox(big ? 84 : 58, live)}>{started ? `${match.homeScore ?? 0} - ${match.awayScore ?? 0}` : '– –'}</div>
                ) : (
                  <div style={{ lineHeight: 1 }}>
                    <div style={{ fontSize: big ? 84 : 58, fontWeight: 900, color: GOLD }}>{match.time}</div>
                    <div style={{ marginTop: 6, fontSize: big ? 26 : 22, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: '#67e8f9' }}>{formatDay(match.date)}</div>
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 18, minWidth: 0 }}>
                <TeamCrest team={away} size={crest} />
                <span style={{ fontSize: nameSize, fontWeight: 900, textTransform: 'uppercase', lineHeight: 1.05, overflow: 'hidden', textOverflow: 'ellipsis' }}>{away.name}</span>
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

export function StandingsTemplate({ format, category, rows }: StandingsProps) {
  const n = Math.max(1, rows.length);
  const rowH = n <= 6 ? 96 : n <= 8 ? 82 : 70;
  const th: CSSProperties = { fontSize: 24, fontWeight: 800, letterSpacing: 3, color: '#94a3b8', textAlign: 'center' };
  return (
    <Frame format={format} category={category} title="Classificació" subtitle={category.label}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '70px 1fr 90px 100px 130px', alignItems: 'center', padding: '0 24px' }}>
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
                gridTemplateColumns: '70px 1fr 90px 100px 130px',
                alignItems: 'center',
                height: rowH,
                padding: '0 24px',
                borderRadius: 22,
                background: leader ? 'rgba(251,191,36,.16)' : 'rgba(15,23,42,.72)',
                border: `2px solid ${leader ? 'rgba(251,191,36,.6)' : playoff ? 'rgba(16,185,129,.45)' : 'rgba(255,255,255,.09)'}`,
              }}
            >
              <span style={{ textAlign: 'center', fontSize: 40, fontWeight: 900, color: leader ? GOLD : '#fff' }}>{r.position}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 18, minWidth: 0 }}>
                <TeamCrest team={r.team} size={rowH - 26} />
                <span style={{ fontSize: 36, fontWeight: 900, textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.team.name}</span>
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

export function ScorersTemplate({ format, category, entries }: ScorersProps) {
  const [first, ...rest] = entries;
  return (
    <Frame format={format} category={category} title="Pitxitxi" subtitle="Màxims golejadors">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {first && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 34, padding: '26px 34px', borderRadius: 32, background: 'linear-gradient(135deg, rgba(251,191,36,.28), rgba(251,191,36,.06))', border: '3px solid rgba(251,191,36,.65)' }}>
            <PlayerAvatar player={first.player} team={first.team} size={210} className="ring-4 ring-amber-400" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: 5, color: GOLD }}>👑 LÍDER</div>
              <div style={{ fontSize: 66, fontWeight: 900, textTransform: 'uppercase', lineHeight: 1 }}>{first.player.name}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 10, fontSize: 32, fontWeight: 700, color: '#cbd5e1' }}>
                {first.team && <TeamCrest team={first.team} size={44} />} {first.team?.name}
              </div>
            </div>
            <div style={{ textAlign: 'center', lineHeight: 0.9 }}>
              <div style={{ fontSize: 170, fontWeight: 900, color: GOLD }}>{first.player.stats.goals}</div>
              <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: 4, color: '#94a3b8' }}>GOLS</div>
            </div>
          </div>
        )}
        {rest.map(({ player, team }, i) => (
          <div key={player.id} style={{ display: 'flex', alignItems: 'center', gap: 26, padding: '14px 30px', borderRadius: 24, background: 'rgba(15,23,42,.72)', border: '2px solid rgba(255,255,255,.1)' }}>
            <span style={{ width: 56, textAlign: 'center', fontSize: 46, fontWeight: 900, color: '#94a3b8' }}>{i + 2}</span>
            <PlayerAvatar player={player} team={team} size={96} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 42, fontWeight: 900, textTransform: 'uppercase', lineHeight: 1.05, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{player.name}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 26, fontWeight: 600, color: '#94a3b8' }}>
                {team && <TeamCrest team={team} size={30} />} {team?.name}
              </div>
            </div>
            <span style={{ fontSize: 84, fontWeight: 900, color: GOLD }}>{player.stats.goals}</span>
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
  const size = format === 'story' ? 820 : format === 'square' ? 560 : 660;
  return (
    <Frame format={format} category={category} title="MVP" subtitle={label}>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <div style={{ filter: `drop-shadow(0 30px 70px ${(team?.primaryColor ?? category.accent)}aa)` }}>
          <PlayerCard player={player} team={team} size={size} tilt={false} ribbon="MVP" />
        </div>
      </div>
    </Frame>
  );
}
