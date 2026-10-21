import type {
  CategoryId,
  GalleryItem,
  LeagueData,
  Match,
  MatchEvent,
  NewsItem,
  Player,
  Position,
  Team,
} from '@/types';
import { emptyStats, recomputePlayerStats } from '@/lib/standings';
import { toISODate, toTimeString } from '@/lib/utils';

/**
 * Seed data (DEMO). Teams, players, results and photos are fictional placeholders so the
 * app looks alive from the very first load — replace them from the Admin panel.
 *
 * The generator is deterministic (seeded PRNG) and every date is relative to "now", so there is
 * always a live match and upcoming fixtures the first time the app is opened.
 */

// ───────────────────────── helpers ─────────────────────────

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Rand = () => number;

const poisson = (lambda: number, r: Rand) => {
  const limit = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= r();
  } while (p > limit);
  return k - 1;
};

function pickWeighted<T>(items: T[], weights: number[], r: Rand): T {
  const total = weights.reduce((a, b) => a + b, 0);
  let x = r() * total;
  for (let i = 0; i < items.length; i++) {
    x -= weights[i];
    if (x <= 0) return items[i];
  }
  return items[items.length - 1];
}

const shuffle = <T,>(arr: T[], r: Rand) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const roundTo5 = (d: Date) => {
  const ms = 5 * 60_000;
  return new Date(Math.round(d.getTime() / ms) * ms);
};

const addDays = (base: Date, n: number) => new Date(base.getFullYear(), base.getMonth(), base.getDate() + n);

// ───────────────────────── teams ─────────────────────────

interface TeamSeed {
  id: string;
  name: string;
  shortName: string;
  president: string;
  primary: string;
  secondary: string;
  strength: number;
  history: string;
}

const TEAM_SEEDS: Record<CategoryId, TeamSeed[]> = {
  senior: [
    { id: 'sen-pardinyes', name: 'Pardinyes Warriors', shortName: 'PAR', president: 'Jordi Camps', primary: '#F59E0B', secondary: '#111827', strength: 1.4, history: 'Nacidos en el barrio de Pardinyes, juegan a un ritmo vertiginoso: presión alta, rotaciones largas y una grada que no baja nunca el volumen.' },
    { id: 'sen-cappont', name: 'Cappont United', shortName: 'CAP', president: 'Marta Solé', primary: '#06B6D4', secondary: '#0b1220', strength: 1.25, history: 'Un proyecto joven con fútbol de toque y mucha pizarra. Su presidenta presume de tener el mejor banquillo de la liga.' },
    { id: 'sen-barrisnord', name: 'Barris Nord FS', shortName: 'BNO', president: 'Oriol Farré', primary: '#EF4444', secondary: '#1f1f23', strength: 1.1, history: 'Garra, contragolpe y orgullo de barrio. Cuando el Barris Nord huele sangre, no perdona.' },
    { id: 'sen-segre', name: 'Segre Titans', shortName: 'SEG', president: 'Núria Gené', primary: '#10B981', secondary: '#052e2b', strength: 1.0, history: 'Físicos, intensos y muy difíciles de superar en pista pequeña. Su pívot es una pesadilla para cualquier cierre.' },
    { id: 'sen-seuvella', name: 'La Seu Vella FC', shortName: 'SEU', president: 'Pol Bellmunt', primary: '#8B5CF6', secondary: '#1e1b4b', strength: 0.9, history: 'Historia, templanza y un portero de leyenda. Les gusta gestionar los partidos desde la calma… hasta que aprietan.' },
    { id: 'sen-onze', name: 'Onze de Setembre CF', shortName: 'ONZ', president: 'Albert Closa', primary: '#3B82F6', secondary: '#0f172a', strength: 0.85, history: 'La grada más ruidosa del pabellón. Su estilo es directo, vertical y con mucha pierna fuerte.' },
    { id: 'sen-mariola', name: 'Mariola Wolves', shortName: 'MAR', president: 'Clàudia Tarrés', primary: '#EC4899', secondary: '#2a0f20', strength: 0.75, history: 'Manada joven y descarada que muerde en transiciones. Todavía aprenden a cerrar los partidos.' },
    { id: 'sen-bordeta', name: 'Bordeta Stars', shortName: 'BOR', president: 'Xavier Orriols', primary: '#F97316', secondary: '#1c1917', strength: 0.65, history: 'Equipo de corazón y tercer tiempo. Les falta pegada, pero nunca les falta ambiente.' },
  ],
  juvenil: [
    { id: 'juv-gardeny', name: 'Gardeny Juniors', shortName: 'GAR', president: 'Laia Segarra', primary: '#F59E0B', secondary: '#1c1917', strength: 1.3, history: 'La cantera con más hambre de la liga. Juegan sin miedo y con la pizarra aprendida de memoria.' },
    { id: 'juv-magraners', name: 'Magraners FS', shortName: 'MAG', president: 'Marc Esteve', primary: '#EF4444', secondary: '#3b0a0a', strength: 1.15, history: 'Rojo granada y mucho descaro. Un bloque muy unido que defiende y ataca todos juntos.' },
    { id: 'juv-templers', name: 'Templers Academy', shortName: 'TEM', president: 'Anna Calvet', primary: '#06B6D4', secondary: '#082f49', strength: 1.0, history: 'Disciplina táctica y balón parado. Los entrenadores rivales los estudian con lupa.' },
    { id: 'juv-horta', name: 'Horta Rockets', shortName: 'HOR', president: 'Pau Miró', primary: '#10B981', secondary: '#022c22', strength: 0.9, history: 'Velocidad pura por banda. Cuando aciertan, son imparables; cuando no, se ríen igual.' },
    { id: 'juv-rufea', name: 'Rufea Lions', shortName: 'RUF', president: 'Èric Boldú', primary: '#EAB308', secondary: '#1a1500', strength: 0.8, history: 'Melena al viento y carácter. Una plantilla muy joven que crece partido a partido.' },
    { id: 'juv-noguera', name: 'Noguera Tigers', shortName: 'NOG', president: 'Sara Ibars', primary: '#F97316', secondary: '#1c0f05', strength: 0.7, history: 'Llegan desde la comarca con ganas de dar la sorpresa. Fuertes en casa, a prueba fuera.' },
  ],
  junior: [
    { id: 'jun-balafia', name: 'Balàfia Phoenix', shortName: 'BAL', president: 'Aleix Mateu', primary: '#EF4444', secondary: '#1f0b0b', strength: 1.35, history: 'Resurgen de cada derrota. Intensidad, ritmo alto y mucha fe en el último minuto.' },
    { id: 'jun-ciutatjardi', name: 'Ciutat Jardí FS', shortName: 'CIU', president: 'Berta Prat', primary: '#10B981', secondary: '#04201a', strength: 1.15, history: 'Técnicos, descarados y con un cierre que dirige la orquesta. Se divierten jugando.' },
    { id: 'jun-llotja', name: 'Llotja Dragons', shortName: 'LLO', president: 'Gerard Sala', primary: '#8B5CF6', secondary: '#1a1035', strength: 1.0, history: 'Fuego en la pista y pocas palabras fuera de ella. Su arma: el 4-0 en movimiento.' },
    { id: 'jun-butsenit', name: 'Butsènit Rangers', shortName: 'BUT', president: 'Judit Roca', primary: '#3B82F6', secondary: '#0b1426', strength: 0.9, history: 'Equipo de pueblo grande, trabajo duro y piernas largas. No regalan ni un balón.' },
    { id: 'jun-seca', name: 'Secà Sharks', shortName: 'SEC', president: 'Adrià Vilà', primary: '#06B6D4', secondary: '#051b20', strength: 0.8, history: 'Presionan en grupo y huelen el error rival. Un equipo incómodo para cualquiera.' },
    { id: 'jun-xalets', name: 'Xalets Blaugrana', shortName: 'XAL', president: 'Roger Font', primary: '#F59E0B', secondary: '#1b1204', strength: 0.7, history: 'Mucho corazón, mucho colorido y una afición que viaja a todos los pabellones.' },
  ],
  femenina: [
    { id: 'fem-valkyries', name: 'Valkyries FS', shortName: 'VAL', president: 'Irene Montoya', primary: '#EC4899', secondary: '#2a0f20', strength: 1.4, history: 'Las campeonas a batir. Mucho talento, mucha pizarra y la mejor pareja de ala-pívot de la liga.' },
    { id: 'fem-cappontqueens', name: 'Cappont Queens', shortName: 'CQU', president: 'Mireia Pujol', primary: '#F59E0B', secondary: '#1c1304', strength: 1.2, history: 'Reinas del toque y la combinación. Su juego asociativo es un espectáculo en pista corta.' },
    { id: 'fem-lionesses', name: 'Barris Nord Lionesses', shortName: 'BNL', president: 'Carla Domènech', primary: '#EF4444', secondary: '#220808', strength: 1.05, history: 'Garra y carácter. Las leonas nunca dan un balón por perdido y lo celebran a lo grande.' },
    { id: 'fem-amazons', name: 'Mariola Amazons', shortName: 'AMA', president: 'Èlia Costa', primary: '#10B981', secondary: '#04201a', strength: 0.9, history: 'Rápidas y valientes. Se atreven con todo, incluso con las que van primeras.' },
    { id: 'fem-foxes', name: 'Horta Foxes', shortName: 'FOX', president: 'Ona Lladó', primary: '#F97316', secondary: '#1c0f05', strength: 0.8, history: 'Astutas y letales al contragolpe. Siempre encuentran el hueco que nadie ve.' },
    { id: 'fem-eagles', name: 'Seu Vella Eagles', shortName: 'EAG', president: 'Aina Peris', primary: '#3B82F6', secondary: '#0b1426', strength: 0.7, history: 'Visión de juego desde las alturas. Un equipo en construcción con una cantera prometedora.' },
  ],
};

// ───────────────────────── players ─────────────────────────

const MALE_FIRST = ['Marc', 'Pau', 'Jordi', 'Oriol', 'Arnau', 'Joan', 'Biel', 'Pol', 'Èric', 'Ferran', 'Xavier', 'Albert', 'Adrià', 'Guillem', 'Roger', 'Nil', 'Aleix', 'Sergi', 'Marcel', 'Iván', 'Dani', 'Carles', 'Joel', 'Àlex', 'Víctor', 'Raül', 'Gerard', 'Ramon', 'Quim', 'Isaac', 'Hugo', 'Mateo', 'Samuel', 'Yassine', 'Karim', 'Brais', 'Nacho', 'Rubén', 'Cristian', 'Jaume', 'Lluc', 'Martí', 'Genís', 'Abel', 'Eloi', 'Bruno', 'Dídac', 'Ismael', 'Moha', 'Toni'];
const FEMALE_FIRST = ['Núria', 'Laia', 'Marta', 'Júlia', 'Aina', 'Carla', 'Mireia', 'Berta', 'Clàudia', 'Paula', 'Anna', 'Sara', 'Judit', 'Èlia', 'Irene', 'Maria', 'Alba', 'Ona', 'Mar', 'Marina', 'Gemma', 'Eva', 'Cristina', 'Noa', 'Sílvia', 'Queralt', 'Neus', 'Rosa', 'Lucía', 'Sofía', 'Aitana', 'Nerea', 'Leire', 'Aroa', 'Xènia', 'Abril', 'Triana', 'Emma', 'Vera', 'Mònica'];
const SURNAMES = ['Puig', 'Ribera', 'Soler', 'Vidal', 'Roca', 'Ferrer', 'Mas', 'Pons', 'Serra', 'Casals', 'Camps', 'Bosch', 'Farré', 'Pujol', 'Vilà', 'Sala', 'Prat', 'Font', 'Rovira', 'Montoya', 'García', 'Martínez', 'López', 'Sánchez', 'Gómez', 'Navarro', 'Torres', 'Domènech', 'Costa', 'Lladó', 'Gené', 'Closa', 'Tarrés', 'Esteve', 'Mateu', 'Bellmunt', 'Segarra', 'Miró', 'Calvet', 'Orriols', 'Boldú', 'Ibars', 'Agramunt', 'Gilabert', 'Bernaus', 'Sans', 'Oliva', 'Peris', 'Ortiz', 'Benali', 'Diallo', 'Rodrigues', 'Cuadrado', 'Alsina', 'Garrofé', 'Capdevila', 'Maldonado', 'Baró'];

const NICKNAMES: Record<Position, string[]> = {
  Portero: ['El Muro', 'Gatito', 'Pulpo', 'Manos', 'Spiderman'],
  Cierre: ['El General', 'Cerebro', 'Pilar', 'Capi', 'Brújula'],
  Ala: ['Flash', 'El Cohete', 'Mosca', 'Rayo', 'Bala', 'Zurdo'],
  Pívot: ['El Tanque', 'Torre', 'Martillo', 'Rinoceronte', 'Killer'],
};

const SQUAD: Position[] = ['Portero', 'Portero', 'Cierre', 'Cierre', 'Ala', 'Ala', 'Ala', 'Pívot', 'Pívot'];

const SCORING_WEIGHT: Record<Position, number> = { Portero: 0.04, Cierre: 1.2, Ala: 3, Pívot: 3.4 };
const ASSIST_WEIGHT: Record<Position, number> = { Portero: 0.15, Cierre: 2.2, Ala: 3, Pívot: 1.4 };
const CARD_WEIGHT: Record<Position, number> = { Portero: 0.25, Cierre: 3, Ala: 1.8, Pívot: 2 };

interface SquadMember {
  player: Player;
  attack: number;
}

function buildSquads(teams: Team[], r: Rand) {
  const used = new Set<string>();
  const squads = new Map<string, SquadMember[]>();
  const players: Player[] = [];

  for (const team of teams) {
    const female = team.category === 'femenina';
    const firsts = female ? FEMALE_FIRST : MALE_FIRST;
    const dorsals = shuffle(
      Array.from({ length: 22 }, (_, i) => i + 2).filter((n) => n !== 12),
      r,
    );
    const squad: SquadMember[] = [];
    let keeperIdx = 0;

    SQUAD.forEach((position, i) => {
      let name = '';
      do {
        name = `${firsts[Math.floor(r() * firsts.length)]} ${SURNAMES[Math.floor(r() * SURNAMES.length)]}`;
      } while (used.has(name));
      used.add(name);

      const dorsal = position === 'Portero' ? (keeperIdx++ === 0 ? 1 : 12) : dorsals.pop()!;
      const nick = r() < 0.38 ? NICKNAMES[position][Math.floor(r() * NICKNAMES[position].length)] : undefined;
      const player: Player = {
        id: `${team.id}-p${i + 1}`,
        name,
        nickname: nick,
        dorsal,
        position,
        teamId: team.id,
        photoUrl: '',
        stats: emptyStats(),
        adjustments: emptyStats(),
      };
      squad.push({ player, attack: 0.55 + r() * 1.6 });
      players.push(player);
    });
    squads.set(team.id, squad);
  }
  return { players, squads };
}

// ───────────────────────── matches ─────────────────────────

const VENUES = ['Pavelló Barris Nord', 'Pavelló Onze de Setembre', 'Pavelló Cappont', 'Pavelló Pardinyes', 'Pavelló La Mariola'];

interface CategorySchedule {
  finishedMatchdays: number;
  /** Days from today to the current matchday (only for categories with fixed time slots). */
  offsetDays: number;
  slots: string[];
}

const SCHEDULE: Record<CategoryId, CategorySchedule> = {
  senior: { finishedMatchdays: 6, offsetDays: 0, slots: ['19:00', '20:15', '21:30', '22:45'] },
  juvenil: { finishedMatchdays: 5, offsetDays: 2, slots: ['10:00', '11:30', '13:00'] },
  junior: { finishedMatchdays: 4, offsetDays: 3, slots: ['17:00', '18:30', '20:00'] },
  femenina: { finishedMatchdays: 5, offsetDays: 1, slots: ['11:00', '12:30', '14:00'] },
};

const CAT_CODE: Record<CategoryId, string> = { senior: 'sen', juvenil: 'juv', junior: 'jun', femenina: 'fem' };

function roundRobin(ids: string[]): [string, string][][] {
  const n = ids.length;
  const arr = [...ids];
  const first: [string, string][][] = [];
  for (let round = 0; round < n - 1; round++) {
    const pairs: [string, string][] = [];
    for (let i = 0; i < n / 2; i++) {
      const a = arr[i];
      const b = arr[n - 1 - i];
      pairs.push(round % 2 === 0 ? [a, b] : [b, a]);
    }
    first.push(pairs);
    arr.splice(1, 0, arr.pop()!);
  }
  const second = first.map((round) => round.map(([h, a]) => [a, h] as [string, string]));
  return [...first, ...second];
}

interface SimContext {
  r: Rand;
  squads: Map<string, SquadMember[]>;
  strength: Map<string, number>;
}

function simulate(ctx: SimContext, matchId: string, homeId: string, awayId: string, fraction: number, finished: boolean) {
  const { r, squads, strength } = ctx;
  const sH = strength.get(homeId) ?? 1;
  const sA = strength.get(awayId) ?? 1;
  const maxMinute = Math.max(2, Math.round(40 * fraction));
  const homeGoals = poisson(2.9 * Math.sqrt(sH / sA) * fraction, r);
  const awayGoals = poisson(2.4 * Math.sqrt(sA / sH) * fraction, r);

  const events: MatchEvent[] = [];
  const tally = new Map<string, { goals: number; assists: number }>();
  const bump = (id: string, k: 'goals' | 'assists') => {
    const t = tally.get(id) ?? { goals: 0, assists: 0 };
    t[k]++;
    tally.set(id, t);
  };
  const minute = () => 1 + Math.floor(r() * (maxMinute - 1));

  const scoreFor = (scoringTeam: string, concedingTeam: string, count: number) => {
    const scorers = squads.get(scoringTeam) ?? [];
    const opponents = squads.get(concedingTeam) ?? [];
    for (let g = 0; g < count; g++) {
      if (r() < 0.05 && opponents.length) {
        const og = opponents[Math.floor(r() * opponents.length)].player;
        events.push({ id: '', minute: minute(), type: 'own_goal', playerId: og.id, playerName: og.name, teamId: concedingTeam });
        continue;
      }
      const scorer = pickWeighted(scorers, scorers.map((s) => SCORING_WEIGHT[s.player.position] * s.attack), r).player;
      const ev: MatchEvent = { id: '', minute: minute(), type: 'goal', playerId: scorer.id, playerName: scorer.name, teamId: scoringTeam };
      bump(scorer.id, 'goals');
      if (r() < 0.6) {
        const pool = scorers.filter((s) => s.player.id !== scorer.id);
        const assister = pickWeighted(pool, pool.map((s) => ASSIST_WEIGHT[s.player.position] * s.attack), r).player;
        ev.assistPlayerId = assister.id;
        ev.assistPlayerName = assister.name;
        bump(assister.id, 'assists');
      }
      events.push(ev);
    }
  };
  scoreFor(homeId, awayId, homeGoals);
  scoreFor(awayId, homeId, awayGoals);

  const cards = (teamId: string) => {
    const squad = squads.get(teamId) ?? [];
    const yellows = poisson(0.75 * fraction, r);
    for (let c = 0; c < yellows; c++) {
      const p = pickWeighted(squad, squad.map((s) => CARD_WEIGHT[s.player.position]), r).player;
      events.push({ id: '', minute: minute(), type: 'yellow_card', playerId: p.id, playerName: p.name, teamId });
    }
    if (r() < 0.045 * fraction) {
      const p = pickWeighted(squad, squad.map((s) => CARD_WEIGHT[s.player.position]), r).player;
      events.push({ id: '', minute: minute(), type: 'red_card', playerId: p.id, playerName: p.name, teamId });
    }
  };
  cards(homeId);
  cards(awayId);

  events.sort((a, b) => a.minute - b.minute);
  events.forEach((e, i) => (e.id = `${matchId}-e${i + 1}`));

  let mvpPlayerId: string | undefined;
  if (finished) {
    const winner = homeGoals > awayGoals ? homeId : awayGoals > homeGoals ? awayId : null;
    const candidates = [...(squads.get(homeId) ?? []), ...(squads.get(awayId) ?? [])];
    const conceded = (teamId: string) => (teamId === homeId ? awayGoals : homeGoals);
    const weights = candidates.map((c) => {
      const t = tally.get(c.player.id);
      let w = 0.15 + (t ? t.goals * 3 + t.assists * 1.5 : 0);
      if (c.player.teamId === winner) w += 1.2;
      if (c.player.position === 'Portero' && c.player.dorsal === 1 && conceded(c.player.teamId) <= 1) w += 1.4;
      return w;
    });
    mvpPlayerId = pickWeighted(candidates, weights.map((w) => w * w), r).player.id;
  }

  return { homeGoals, awayGoals, events, mvpPlayerId };
}

function buildMatches(teams: Team[], squads: Map<string, SquadMember[]>, now: Date, r: Rand): Match[] {
  const strength = new Map<string, number>();
  for (const cat of Object.values(TEAM_SEEDS)) cat.forEach((t) => strength.set(t.id, t.strength));
  const ctx: SimContext = { r, squads, strength };
  const matches: Match[] = [];
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  (Object.keys(SCHEDULE) as CategoryId[]).forEach((cat) => {
    const cfg = SCHEDULE[cat];
    const ids = teams.filter((t) => t.category === cat).map((t) => t.id);
    const rounds = roundRobin(ids);
    const currentMd = cfg.finishedMatchdays + 1;

    rounds.forEach((pairs, roundIdx) => {
      const md = roundIdx + 1;
      pairs.forEach(([homeId, awayId], idx) => {
        const id = `m-${CAT_CODE[cat]}-${String(md).padStart(2, '0')}-${idx + 1}`;
        const base: Match = {
          id,
          category: cat,
          matchday: md,
          homeTeamId: homeId,
          awayTeamId: awayId,
          homeScore: null,
          awayScore: null,
          status: 'scheduled',
          date: '',
          time: '',
          venue: VENUES[(roundIdx + idx) % VENUES.length],
          events: [],
        };

        const isSeniorCurrent = cat === 'senior' && md === currentMd;
        let kickoff: Date;
        if (isSeniorCurrent) {
          // Matchday "in progress": one match finished, one live, the rest about to start.
          const offsetsMin = [-110, -20, 70, 160];
          kickoff = roundTo5(new Date(now.getTime() + offsetsMin[idx] * 60_000));
        } else {
          const day = addDays(today, cfg.offsetDays + (md - currentMd) * 7);
          const [hh, mm] = cfg.slots[idx % cfg.slots.length].split(':').map(Number);
          kickoff = new Date(day.getFullYear(), day.getMonth(), day.getDate(), hh, mm);
        }
        base.date = toISODate(kickoff);
        base.time = toTimeString(kickoff);

        const isLive = isSeniorCurrent && idx === 1;
        const isFinished = md <= cfg.finishedMatchdays || (isSeniorCurrent && idx === 0);

        if (isFinished) {
          const sim = simulate(ctx, id, homeId, awayId, 1, true);
          Object.assign(base, { status: 'finished', homeScore: sim.homeGoals, awayScore: sim.awayGoals, events: sim.events, mvpPlayerId: sim.mvpPlayerId });
        } else if (isLive) {
          const liveMinute = 17;
          const sim = simulate(ctx, id, homeId, awayId, liveMinute / 40, false);
          Object.assign(base, { status: 'live', homeScore: sim.homeGoals, awayScore: sim.awayGoals, events: sim.events, liveMinute });
        }
        matches.push(base);
      });
    });
  });

  return matches;
}

// ───────────────────────── gallery & news ─────────────────────────

const photo = (id: string, w = 900) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=70`;

function buildGallery(now: Date): GalleryItem[] {
  const day = (back: number) => toISODate(addDays(now, -back));
  const items: Omit<GalleryItem, 'id'>[] = [
    { title: 'Noche de focos en Cappont', matchday: 6, imageUrl: photo('1431324155629-1a6deb1dec8d'), category: 'senior', teamId: 'sen-cappont', date: day(1), caption: 'Los focos se encienden y el pabellón huele a derbi.', tags: ['ambiente', 'senior'] },
    { title: 'El balón de la jornada', matchday: 6, imageUrl: photo('1486286701208-1d58e9338013'), category: 'senior', date: day(1), caption: 'El balón oficial de la Lleida League, listo para otra batalla presidencial.', tags: ['balón', 'oficial'] },
    { title: 'Duelo en la media pista', matchday: 5, imageUrl: photo('1553778263-73a83bab9b0c'), category: 'senior', teamId: 'sen-pardinyes', date: day(8), caption: 'Pierna fuerte y balón dividido: así se gana una jornada.', tags: ['acción', 'senior'] },
    { title: 'Golpeo de bandera', matchday: 5, imageUrl: photo('1517466787929-bc90951d0974'), category: 'juvenil', teamId: 'juv-gardeny', date: day(8), caption: 'La cantera también sabe de remates imposibles.', tags: ['acción', 'juvenil'] },
    { title: 'La grada se hace oír', matchday: 4, imageUrl: photo('1522778119026-d647f0596c20'), category: 'general', date: day(15), caption: 'La grada, el jugador número seis de cada equipo.', tags: ['grada', 'ambiente'] },
    { title: 'Concentración antes del saque', matchday: 4, imageUrl: photo('1574629810360-7efbbe195018'), category: 'junior', teamId: 'jun-balafia', date: day(15), caption: 'Último vistazo al balón antes de arrancar el partido.', tags: ['previa', 'junior'] },
    { title: 'Entrenamiento a puerta cerrada', matchday: 3, imageUrl: photo('1518604666860-9ed391f76460'), category: 'femenina', teamId: 'fem-valkyries', date: day(22), caption: 'Las Valkyries preparan el derbi con balones por todas partes.', tags: ['entrenamiento', 'femenina'] },
    { title: 'Línea de banda', matchday: 3, imageUrl: photo('1459865264687-595d652de67e'), category: 'general', date: day(22), caption: 'Donde empieza todo: la línea, el césped y el silbato.', tags: ['pista'] },
    { title: 'Esperando el silbato', matchday: 2, imageUrl: photo('1551958219-acbc608c6377'), category: 'junior', date: day(29), caption: 'Tres balones, un solo campeón.', tags: ['balón', 'junior'] },
    { title: 'Botas de campeona', matchday: 2, imageUrl: photo('1579952363873-27f3bade9f55'), category: 'femenina', date: day(29), caption: 'Ajustando los tacos antes del pitido inicial.', tags: ['previa', 'femenina'] },
    { title: 'Remate al aire', matchday: 1, imageUrl: photo('1560272564-c83b66b1ad12'), category: 'senior', date: day(36), caption: 'La primera jornada ya dejó imágenes para el recuerdo.', tags: ['acción', 'inicio'] },
    { title: 'Pista bajo las estrellas', matchday: 1, imageUrl: photo('1487466365202-1afdb86c764e'), category: 'general', date: day(36), caption: 'La liga arranca en una noche de gala.', tags: ['ambiente', 'inicio'] },
    { title: 'Noche de gala', matchday: 1, imageUrl: photo('1489944440615-453fc2b6a9a9'), category: 'general', date: day(36), caption: 'Gran noche de fútbol: así soñamos llenar cada pabellón.', tags: ['grada', 'inicio'] },
    { title: 'Esquina y estrategia', matchday: 4, imageUrl: photo('1529900748604-07564a03e7a6'), category: 'juvenil', teamId: 'juv-templers', date: day(15), caption: 'Los Templers estudian el córner antes de ejecutarlo.', tags: ['táctica', 'juvenil'] },
  ];
  return items.map((it, i) => ({ id: `g-${String(i + 1).padStart(2, '0')}`, ...it }));
}

function buildNews(teams: Team[], now: Date): NewsItem[] {
  const name = (id: string) => teams.find((t) => t.id === id)?.name ?? id;
  const day = (back: number) => toISODate(addDays(now, -back));
  return [
    { id: 'n-01', headline: 'Jornada 7 en directo: la Senior League vuelve a la pista', summary: `${name('sen-pardinyes')} y ${name('sen-cappont')} se juegan el liderato en una jornada con todos los partidos en directo y presidentes en la grada.`, date: day(0), badge: 'Oficial', category: 'senior' },
    { id: 'n-02', headline: 'Abierto el mercado: los presidentes mueven ficha', summary: `${name('sen-segre')} y ${name('sen-seuvella')} negocian refuerzos para el tramo decisivo. El plazo de fichajes cierra la próxima semana.`, date: day(2), badge: 'Mercado' },
    { id: 'n-03', headline: 'El Comité sanciona con dos partidos por conducta antideportiva', summary: `Tras revisar el acta de la última jornada, el Comité de Competición castiga a un jugador de ${name('sen-barrisnord')} con dos encuentros de suspensión.`, date: day(3), badge: 'Sanción', category: 'senior' },
    { id: 'n-04', headline: 'Femenina League: récord de asistencia en la jornada 5', summary: `El derbi entre ${name('fem-valkyries')} y ${name('fem-cappontqueens')} llenó el pabellón y marcó el récord de público de la temporada.`, date: day(5), badge: 'Oficial', category: 'femenina' },
    { id: 'n-05', headline: 'Nuevo premio presidencial: MVP de cada jornada', summary: 'La organización premiará al mejor jugador de cada jornada con la tarjeta dorada y mención especial en las redes de la liga.', date: day(9), badge: 'Oficial' },
    { id: 'n-06', headline: 'Fichaje sorpresa en la Junior League', summary: `${name('jun-llotja')} refuerza su línea ofensiva con un ala zurdo procedente de la cantera local. Debutará en la próxima jornada.`, date: day(11), badge: 'Mercado', category: 'junior' },
  ];
}

// ───────────────────────── public API ─────────────────────────

export function createInitialLeagueData(now: Date = new Date()): LeagueData {
  const r = mulberry32(2023);
  const teams: Team[] = (Object.keys(TEAM_SEEDS) as CategoryId[]).flatMap((category) =>
    TEAM_SEEDS[category].map((t) => ({
      id: t.id,
      name: t.name,
      shortName: t.shortName,
      presidentName: t.president,
      logoUrl: '',
      primaryColor: t.primary,
      secondaryColor: t.secondary,
      category,
      history: t.history,
    })),
  );

  const { players, squads } = buildSquads(teams, r);
  const matches = buildMatches(teams, squads, now, r);

  return {
    teams,
    players: recomputePlayerStats(players, matches),
    matches,
    gallery: buildGallery(now),
    news: buildNews(teams, now),
  };
}

