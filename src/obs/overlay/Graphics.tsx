import { motion } from 'framer-motion';
import type { ObsGraphic, ObsPlayer, ObsTeam } from '@/obs/types';
import type { Position } from '@/types';
import { POSITION_LABEL, POSITION_SHORT } from '@/config/site';
import { PlayerAvatar } from '@/components/ui/PlayerAvatar';
import { TeamCrest } from '@/components/ui/TeamCrest';
import { formatDateLong } from '@/lib/utils';
import { PollGraphic } from '@/obs/overlay/PollGraphic';
import { Board, EASE_OUT, FormChips, GOLD_GRADIENT, PANEL_BG, alpha, goldText, listItem, listParent } from '@/obs/overlay/kit';

type G<K extends ObsGraphic['kind']> = Extract<ObsGraphic, { kind: K }>;

// ───────────────────────── Lineup / squad ─────────────────────────

const SLOTS: { role: Position; x: number; y: number }[] = [
  { role: 'Portero', x: 9, y: 50 },
  { role: 'Cierre', x: 31, y: 50 },
  { role: 'Ala', x: 53, y: 20 },
  { role: 'Ala', x: 53, y: 80 },
  { role: 'Pívot', x: 76, y: 50 },
];

/** Puts each starter on the futsal diamond by position; anyone left over fills the free spots. */
function placeStarters(starters: ObsPlayer[]) {
  const free = SLOTS.map((s, i) => ({ ...s, i }));
  const placed: { player: ObsPlayer; x: number; y: number }[] = [];
  const rest: ObsPlayer[] = [];
  for (const p of starters.slice(0, 5)) {
    const k = free.findIndex((s) => s.role === p.position);
    if (k === -1) rest.push(p);
    else placed.push({ player: p, ...free.splice(k, 1)[0] });
  }
  for (const p of rest) {
    const s = free.shift();
    if (s) placed.push({ player: p, ...s });
  }
  return placed;
}

function Court({ color }: { color: string }) {
  const line = 'rgba(255,255,255,.55)';
  return (
    <svg viewBox="0 0 400 240" className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id="court" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={alpha(color, 0.35)} />
          <stop offset="1" stopColor="rgba(8,11,17,.6)" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="400" height="240" rx="10" fill="url(#court)" />
      {Array.from({ length: 8 }, (_, i) => (
        <rect key={i} x={i * 50} y="0" width="25" height="240" fill="#fff" opacity="0.025" />
      ))}
      <g fill="none" stroke={line} strokeWidth="2">
        <rect x="6" y="6" width="388" height="228" rx="4" />
        <line x1="200" y1="6" x2="200" y2="234" />
        <circle cx="200" cy="120" r="30" />
        <path d="M6 70 h40 a30 30 0 0 1 0 100 h-40" />
        <path d="M394 70 h-40 a30 30 0 0 0 0 100 h40" />
      </g>
      <circle cx="200" cy="120" r="3" fill={line} />
    </svg>
  );
}

function PitchToken({ player, team, delay }: { player: ObsPlayer; team: ObsTeam; delay: number }) {
  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay, type: 'spring', damping: 13, stiffness: 180 }}
      className="flex w-[210px] flex-col items-center"
    >
      <div className="relative">
        <div className="rounded-full p-[5px]" style={{ background: `linear-gradient(135deg, ${team.primaryColor}, ${team.secondaryColor})`, boxShadow: `0 0 28px ${alpha(team.primaryColor, 0.7)}` }}>
          <PlayerAvatar player={player} team={team} size={108} />
        </div>
        <span className="absolute -right-2 -top-1 grid h-[46px] w-[46px] place-items-center rounded-full border-2 border-slate-950 text-[26px] font-black text-slate-950" style={{ background: GOLD_GRADIENT }}>
          {player.dorsal}
        </span>
      </div>
      <span className="mt-2 max-w-[210px] truncate rounded-lg bg-black/75 px-3 py-1 text-[24px] font-black uppercase leading-none text-white">{player.nickname || player.name}</span>
    </motion.div>
  );
}

function LineupGraphic({ g, accent }: { g: G<'lineup'>; accent: string }) {
  const crestRight = (
    <div className="flex items-center gap-5">
      {g.team.presidentName && (
        <div className="text-right leading-tight">
          <p className="text-[16px] font-bold uppercase tracking-[0.25em] text-slate-400">President</p>
          <p className="max-w-[340px] truncate text-[26px] font-black uppercase text-amber-300">{g.team.presidentName}</p>
        </div>
      )}
      <TeamCrest team={g.team} size={96} />
    </div>
  );

  if (g.starters.length > 0) {
    const placed = placeStarters(g.starters);
    return (
      <Board eyebrow={g.title || 'Quintet inicial'} title={g.team.name} accent={accent} width={1560} right={crestRight}>
        <div className="flex gap-8">
          <div className="relative h-[540px] w-[900px] shrink-0 overflow-hidden rounded-2xl border border-white/10">
            <Court color={g.team.primaryColor} />
            {placed.map((s, i) => (
              <div key={s.player.id} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${s.x}%`, top: `${s.y}%` }}>
                <PitchToken player={s.player} team={g.team} delay={0.35 + i * 0.12} />
              </div>
            ))}
          </div>
          <div className="min-w-0 flex-1">
            <p className="mb-3 text-[22px] font-black uppercase tracking-[0.3em] text-slate-400">Suplents</p>
            {g.bench.length === 0 ? (
              <p className="text-[24px] text-slate-500">Sense suplents</p>
            ) : (
              <motion.ul variants={listParent} initial="hidden" animate="show" className="space-y-2">
                {g.bench.slice(0, 10).map((p) => (
                  <motion.li key={p.id} variants={listItem} className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.04] px-3 py-1.5">
                    <span className="grid h-[40px] w-[48px] shrink-0 place-items-center rounded-lg text-[24px] font-black text-slate-950" style={{ background: GOLD_GRADIENT }}>
                      {p.dorsal}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[26px] font-black uppercase text-white">{p.name}</span>
                    <span className="text-[18px] font-bold uppercase tracking-wider text-slate-400">{POSITION_SHORT[p.position]}</span>
                  </motion.li>
                ))}
              </motion.ul>
            )}
          </div>
        </div>
      </Board>
    );
  }

  const squad = g.bench;
  const cols = squad.length > 12 ? 6 : 5;
  return (
    <Board eyebrow={g.title || 'Plantilla'} title={g.team.name} accent={accent} width={1560} right={crestRight}>
      {squad.length === 0 ? (
        <p className="py-10 text-center text-[30px] text-slate-400">Aquest equip encara no té jugadors.</p>
      ) : (
        <motion.div variants={listParent} initial="hidden" animate="show" className="grid gap-4" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
          {squad.map((p) => (
            <motion.div
              key={p.id}
              variants={{ hidden: { opacity: 0, y: 30, scale: 0.9 }, show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.45, ease: EASE_OUT } } }}
              className="relative flex flex-col items-center overflow-hidden rounded-2xl border border-white/10 px-3 pb-4 pt-5"
              style={{ background: `linear-gradient(180deg, ${alpha(g.team.primaryColor, 0.28)}, rgba(8,11,17,.6))` }}
            >
              <span className="absolute right-3 top-1 text-[56px] font-black leading-none text-white/10">{p.dorsal}</span>
              <PlayerAvatar player={p} team={g.team} size={104} />
              <p className="mt-3 w-full truncate text-center text-[26px] font-black uppercase leading-none text-white">{p.name}</p>
              <p className="mt-1.5 text-[17px] font-bold uppercase tracking-[0.2em] text-amber-300">
                #{p.dorsal} · {POSITION_LABEL[p.position]}
              </p>
            </motion.div>
          ))}
        </motion.div>
      )}
    </Board>
  );
}

// ───────────────────────── Match preview (VS) ─────────────────────────

function PreviewSide({ team, row, side }: { team: ObsTeam; row: G<'preview'>['homeRow']; side: 'home' | 'away' }) {
  const home = side === 'home';
  return (
    <motion.div
      initial={{ x: home ? -500 : 500, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ delay: 0.1, duration: 0.7, ease: EASE_OUT }}
      className="relative flex w-[640px] flex-col items-center overflow-hidden rounded-[28px] border border-white/10 px-8 pb-8 pt-10"
      style={{ background: `linear-gradient(${home ? 135 : 225}deg, ${alpha(team.primaryColor, 0.55)} 0%, ${alpha(team.secondaryColor, 0.5)} 45%, rgba(8,11,17,.95) 100%)`, boxShadow: `0 40px 100px -30px ${alpha(team.primaryColor, 0.7)}` }}
    >
      <motion.div initial={{ scale: 0.4, rotate: home ? -20 : 20 }} animate={{ scale: 1, rotate: 0 }} transition={{ delay: 0.45, type: 'spring', damping: 12 }}>
        <TeamCrest team={team} size={220} />
      </motion.div>
      <p className="mt-6 line-clamp-2 w-full text-center font-black uppercase leading-[0.95] text-white" style={{ fontSize: team.name.length > 18 ? 46 : team.name.length > 13 ? 52 : 60 }}>
        {team.name}
      </p>
      {team.presidentName && <p className="mt-3 max-w-full truncate text-[22px] font-bold uppercase tracking-[0.2em] text-slate-300">President: {team.presidentName}</p>}
      {row && (
        <div className="mt-6 flex items-center gap-5">
          <span className="rounded-xl bg-black/55 px-4 py-2 text-[30px] font-black text-amber-300">
            {row.position}º · {row.points} pts
          </span>
          <FormChips form={row.form} size={34} />
        </div>
      )}
    </motion.div>
  );
}

function PreviewGraphic({ g, accent }: { g: G<'preview'>; accent: string }) {
  const when = [g.matchday ? `Jornada ${g.matchday}` : null, g.date ? formatDateLong(g.date) : null, g.time || null].filter(Boolean).join(' · ');
  return (
    <div className="flex flex-col items-center font-display">
      <motion.p initial={{ y: -30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.5 }} className="mb-6 rounded-full px-7 py-2 text-[26px] font-black uppercase tracking-[0.35em] text-slate-950" style={{ background: accent }}>
        {g.categoryLabel}
      </motion.p>
      <div className="flex items-center gap-10">
        <PreviewSide team={g.home} row={g.homeRow} side="home" />
        <motion.span initial={{ scale: 3, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.75, type: 'spring', damping: 10 }} className="text-[150px] font-black italic leading-none" style={{ ...goldText, filter: 'drop-shadow(0 0 30px rgba(251,191,36,.6))' }}>
          VS
        </motion.span>
        <PreviewSide team={g.away} row={g.awayRow} side="away" />
      </div>
      <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 1, duration: 0.5 }} className="mt-7 rounded-2xl border border-white/10 px-8 py-3 text-center" style={{ background: PANEL_BG }}>
        <p className="text-[30px] font-black uppercase tracking-wide text-white">{when}</p>
        {g.venue && <p className="mt-1 text-[22px] font-bold uppercase tracking-[0.2em] text-slate-400">{g.venue}</p>}
      </motion.div>
    </div>
  );
}

// ───────────────────────── Featured player / MVP ─────────────────────────

function PlayerGraphic({ g, accent }: { g: G<'player'>; accent: string }) {
  const { player, team, stats } = g;
  const tiles: [string, number][] = [
    ['Gols', stats.goals],
    ['Assistències', stats.assists],
    ['MVPs', stats.mvpAwards],
    ['Partits', stats.matchesPlayed],
  ];
  return (
    <div className="relative flex w-[1460px] overflow-hidden rounded-[32px] border border-white/10 font-display text-white" style={{ background: PANEL_BG, boxShadow: `0 50px 140px -30px rgba(0,0,0,.9), 0 0 100px -40px ${alpha(team.primaryColor, 0.8)}` }}>
      <div className="relative h-[640px] w-[520px] shrink-0 overflow-hidden" style={{ background: `linear-gradient(160deg, ${team.primaryColor} 0%, ${team.secondaryColor} 70%, #05070c 100%)` }}>
        <motion.span
          initial={{ opacity: 0, scale: 1.4 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: EASE_OUT }}
          className="absolute -right-6 top-0 text-[440px] font-black leading-none"
          style={{ color: 'transparent', WebkitTextStroke: '4px rgba(255,255,255,.22)' }}
        >
          {player.dorsal}
        </motion.span>
        <motion.div initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.25, duration: 0.7, ease: EASE_OUT }} className="absolute inset-x-0 bottom-0 flex justify-center pb-10">
          <div className="rounded-[28px] p-[6px]" style={{ background: GOLD_GRADIENT, boxShadow: '0 0 60px rgba(251,191,36,.5)' }}>
            <PlayerAvatar player={player} team={team} size={400} rounded={false} />
          </div>
        </motion.div>
        <div className="absolute left-6 top-6 grid h-[120px] w-[110px] place-items-center rounded-2xl text-slate-950" style={{ background: GOLD_GRADIENT }}>
          <span className="text-[60px] font-black leading-none">{stats.rating}</span>
          <span className="-mt-3 text-[16px] font-black uppercase tracking-[0.2em]">VAL</span>
        </div>
      </div>
      <div className="relative flex min-w-0 flex-1 flex-col justify-center px-14 py-12">
        <div aria-hidden className="pointer-events-none absolute -right-32 -top-32 h-[420px] w-[420px] rounded-full blur-3xl" style={{ background: alpha(accent, 0.25) }} />
        <motion.span initial={{ x: 60, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.3, duration: 0.5 }} className="self-start rounded-full px-6 py-2 text-[26px] font-black uppercase tracking-[0.3em] text-slate-950" style={{ background: GOLD_GRADIENT }}>
          {g.title}
        </motion.span>
        <motion.h2 initial={{ x: 80, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.4, duration: 0.6, ease: EASE_OUT }} className="mt-5 truncate text-[100px] font-black uppercase leading-[0.9]">
          {player.name}
        </motion.h2>
        {player.nickname && <p className="mt-2 text-[36px] font-bold italic text-amber-300">«{player.nickname}»</p>}
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="mt-4 flex items-center gap-3 text-[30px] font-bold uppercase tracking-[0.14em] text-slate-300">
          <TeamCrest team={team} size={46} /> {team.name} · {POSITION_LABEL[player.position]} · #{player.dorsal}
        </motion.p>
        <motion.div variants={listParent} initial="hidden" animate="show" className="mt-9 grid grid-cols-4 gap-4">
          {tiles.map(([label, value]) => (
            <motion.div key={label} variants={{ hidden: { opacity: 0, y: 30 }, show: { opacity: 1, y: 0 } }} className="rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-4 text-center">
              <p className="digital text-[66px] leading-none" style={goldText}>
                {value}
              </p>
              <p className="mt-1 text-[17px] font-bold uppercase tracking-[0.18em] text-slate-400">{label}</p>
            </motion.div>
          ))}
        </motion.div>
        {g.matchLine && (
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1 }} className="mt-6 rounded-xl border border-amber-400/30 bg-amber-400/10 px-5 py-3 text-[28px] font-black uppercase tracking-wide text-amber-200">
            {g.matchLine}
          </motion.p>
        )}
      </div>
    </div>
  );
}

// ───────────────────────── Tables ─────────────────────────

function StandingsGraphic({ g, accent }: { g: G<'standings'>; accent: string }) {
  const th = 'px-2 text-center text-[17px] font-bold uppercase tracking-[0.18em] text-slate-400';
  const compact = g.rows.length > 10;
  const rowH = compact ? 'h-[44px]' : 'h-[58px]';
  return (
    <Board eyebrow={g.categoryLabel} title="Classificació" accent={accent} width={1240}>
      <div className="grid grid-cols-[64px_1fr_70px_70px_70px_70px_90px_100px] items-center pb-2">
        <span className={th}>#</span>
        <span className={`${th} text-left`}>Equip</span>
        <span className={th}>PJ</span>
        <span className={th}>G</span>
        <span className={th}>E</span>
        <span className={th}>P</span>
        <span className={th}>DG</span>
        <span className={`${th} text-amber-300`}>Punts</span>
      </div>
      <motion.ul variants={listParent} initial="hidden" animate="show" className="space-y-1">
        {g.rows.map((r) => {
          const hot = g.highlight.includes(r.team.id);
          const top = r.position <= g.playoffSpots;
          const danger = g.relegationSpots > 0 && r.position > g.totalTeams - g.relegationSpots;
          return (
            <motion.li
              key={r.team.id}
              variants={listItem}
              className={`grid ${rowH} grid-cols-[64px_1fr_70px_70px_70px_70px_90px_100px] items-center rounded-xl`}
              style={{
                background: hot ? `linear-gradient(90deg, ${alpha('#FBBF24', 0.28)}, ${alpha('#FBBF24', 0.06)})` : 'rgba(255,255,255,.035)',
                boxShadow: hot ? 'inset 0 0 0 2px rgba(251,191,36,.6)' : undefined,
              }}
            >
              <span className="text-center text-[28px] font-black" style={{ color: top ? '#FBBF24' : danger ? '#F87171' : '#cbd5e1' }}>
                {r.position}
              </span>
              <span className="flex min-w-0 items-center gap-3">
                <TeamCrest team={r.team} size={compact ? 32 : 40} />
                <span className={`truncate font-black uppercase text-white ${compact ? 'text-[26px]' : 'text-[30px]'}`}>{r.team.name}</span>
              </span>
              <span className="text-center text-[26px] font-bold text-slate-300">{r.played}</span>
              <span className="text-center text-[26px] font-bold text-slate-300">{r.won}</span>
              <span className="text-center text-[26px] font-bold text-slate-300">{r.drawn}</span>
              <span className="text-center text-[26px] font-bold text-slate-300">{r.lost}</span>
              <span className="text-center text-[26px] font-bold text-slate-300">{r.goalDiff > 0 ? `+${r.goalDiff}` : r.goalDiff}</span>
              <span className="digital text-center text-[34px] text-amber-300">{r.points}</span>
            </motion.li>
          );
        })}
      </motion.ul>
    </Board>
  );
}

function ScorersGraphic({ g, accent }: { g: G<'scorers'>; accent: string }) {
  const max = Math.max(1, ...g.rows.map((r) => r.goals));
  return (
    <Board eyebrow={g.categoryLabel} title="Màxims golejadors" accent={accent} width={1240}>
      {g.rows.length === 0 ? (
        <p className="py-10 text-center text-[30px] text-slate-400">Encara no hi ha gols registrats.</p>
      ) : (
        <motion.ul variants={listParent} initial="hidden" animate="show" className="space-y-3">
          {g.rows.map((r, i) => (
            <motion.li key={r.player.id} variants={listItem} className="relative flex items-center gap-5 overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.04] px-5 py-3">
              <motion.span
                aria-hidden
                initial={{ scaleX: 0 }}
                animate={{ scaleX: r.goals / max }}
                transition={{ delay: 0.6 + i * 0.08, duration: 0.8, ease: EASE_OUT }}
                className="absolute inset-y-0 left-0 w-full origin-left"
                style={{ background: `linear-gradient(90deg, ${alpha(r.team.primaryColor, 0.35)}, transparent)` }}
              />
              <span className="relative w-[56px] text-center text-[40px] font-black" style={{ color: i === 0 ? '#FBBF24' : i < 3 ? '#e2e8f0' : '#94a3b8' }}>
                {i + 1}
              </span>
              <span className="relative">
                <PlayerAvatar player={r.player} team={r.team} size={70} />
              </span>
              <span className="relative min-w-0 flex-1">
                <span className="block truncate text-[34px] font-black uppercase leading-none text-white">{r.player.name}</span>
                <span className="mt-1.5 flex items-center gap-2 text-[20px] font-bold uppercase tracking-[0.16em] text-slate-400">
                  <TeamCrest team={r.team} size={24} /> {r.team.name} · {r.assists} assist.
                </span>
              </span>
              <span className="relative text-right">
                <span className="digital block text-[56px] leading-none" style={goldText}>
                  {r.goals}
                </span>
                <span className="text-[15px] font-bold uppercase tracking-[0.25em] text-slate-400">gols</span>
              </span>
            </motion.li>
          ))}
        </motion.ul>
      )}
    </Board>
  );
}

function ResultsGraphic({ g, accent }: { g: G<'results'>; accent: string }) {
  return (
    <Board eyebrow={g.categoryLabel} title={`Jornada ${g.matchday}`} accent={accent} width={1300}>
      {g.matches.length === 0 ? (
        <p className="py-10 text-center text-[30px] text-slate-400">No hi ha partits en aquesta jornada.</p>
      ) : (
        <motion.ul variants={listParent} initial="hidden" animate="show" className="space-y-2.5">
          {g.matches.map((m) => (
            <motion.li key={m.id} variants={listItem} className="grid h-[66px] grid-cols-[140px_1fr_170px_1fr] items-center gap-4 rounded-2xl border border-white/[0.07] bg-white/[0.04] px-4">
              <span
                className="justify-self-start rounded-lg px-3 py-1 text-[17px] font-black uppercase tracking-[0.18em]"
                style={m.status === 'live' ? { background: '#DC2626', color: '#fff' } : m.status === 'finished' ? { background: 'rgba(16,185,129,.18)', color: '#6ee7b7' } : { background: 'rgba(6,182,212,.15)', color: '#67e8f9' }}
              >
                {m.status === 'live' ? '● Directe' : m.status === 'finished' ? 'Final' : m.time}
              </span>
              <span className="flex min-w-0 items-center justify-end gap-3">
                <span className="truncate text-[30px] font-black uppercase text-white">{m.home.name}</span>
                <TeamCrest team={m.home} size={40} />
              </span>
              <span className="digital rounded-xl bg-black/50 py-1 text-center text-[40px] leading-none text-amber-300">
                {m.status === 'scheduled' ? 'vs' : `${m.homeScore} - ${m.awayScore}`}
              </span>
              <span className="flex min-w-0 items-center gap-3">
                <TeamCrest team={m.away} size={40} />
                <span className="truncate text-[30px] font-black uppercase text-white">{m.away.name}</span>
              </span>
            </motion.li>
          ))}
        </motion.ul>
      )}
    </Board>
  );
}

const EVENT_ICON = { goal: '⚽', own_goal: '⚽', yellow_card: '🟨', red_card: '🟥' } as const;

function SummaryGraphic({ g, accent }: { g: G<'summary'>; accent: string }) {
  const side = (s: 'home' | 'away') => g.events.filter((e) => e.side === s);
  const column = (s: 'home' | 'away') => (
    <motion.ul variants={listParent} initial="hidden" animate="show" className={`space-y-2 ${s === 'home' ? 'text-right' : ''}`}>
      {side(s).map((e, i) => (
        <motion.li key={i} variants={listItem} className={`flex items-center gap-3 text-[28px] font-bold uppercase text-white ${s === 'home' ? 'justify-end' : ''}`}>
          {s === 'away' && <span>{EVENT_ICON[e.kind]}</span>}
          <span className="truncate">
            {e.playerName}
            {e.kind === 'own_goal' ? ' (p.p.)' : ''}
          </span>
          <span className="text-amber-300">{e.minute}’</span>
          {s === 'home' && <span>{EVENT_ICON[e.kind]}</span>}
        </motion.li>
      ))}
    </motion.ul>
  );
  return (
    <Board eyebrow="Resum del partit" title={g.title} accent={accent} width={1360}>
      <div className="flex items-center justify-center gap-10">
        <div className="flex w-[420px] items-center justify-end gap-5">
          <span className="line-clamp-2 text-right text-[42px] font-black uppercase leading-[0.95] text-white">{g.home.name}</span>
          <TeamCrest team={g.home} size={110} />
        </div>
        <motion.span initial={{ scale: 1.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.4, type: 'spring', damping: 12 }} className="digital rounded-2xl border border-amber-400/40 bg-black/50 px-8 py-2 text-[110px] leading-none" style={goldText}>
          {g.homeScore}-{g.awayScore}
        </motion.span>
        <div className="flex w-[420px] items-center gap-5">
          <TeamCrest team={g.away} size={110} />
          <span className="line-clamp-2 text-[42px] font-black uppercase leading-[0.95] text-white">{g.away.name}</span>
        </div>
      </div>
      {g.events.length > 0 && (
        <div className="mt-8 grid grid-cols-2 gap-16 border-t border-white/10 pt-6">
          {column('home')}
          {column('away')}
        </div>
      )}
    </Board>
  );
}

export function MainGraphic({ graphic, accent }: { graphic: ObsGraphic; accent: string }) {
  switch (graphic.kind) {
    case 'lineup':
      return <LineupGraphic g={graphic} accent={accent} />;
    case 'preview':
      return <PreviewGraphic g={graphic} accent={accent} />;
    case 'player':
      return <PlayerGraphic g={graphic} accent={accent} />;
    case 'standings':
      return <StandingsGraphic g={graphic} accent={accent} />;
    case 'scorers':
      return <ScorersGraphic g={graphic} accent={accent} />;
    case 'results':
      return <ResultsGraphic g={graphic} accent={accent} />;
    case 'summary':
      return <SummaryGraphic g={graphic} accent={accent} />;
    case 'poll':
      return <PollGraphic g={graphic} accent={accent} />;
  }
}
