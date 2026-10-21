import type {
  CategoryId,
  Champion,
  GalleryItem,
  LeagueData,
  Match,
  MatchEvent,
  NewsItem,
  Player,
  Position,
  Referee,
  Sponsor,
  Team,
} from '@/types';
import { emptyStats, recomputePlayerStats } from '@/lib/standings';
import { DEFAULT_SETTINGS } from '@/lib/gate';
import { toISODate, toTimeString } from '@/lib/utils';

/**
 * Dades inicials (DEMO).
 *
 * - Els 16 equips i presidents de la Senior, els Lleidalitos, el palmarès, els col·laboradors i els
 *   àrbitres vénen de la web antiga (lleidaleague.wixsite.com).
 * - Els partits, resultats, jugadors i les altres tres categories són d'exemple: el generador és
 *   determinista (PRNG amb llavor) i totes les dates són relatives a "avui", així sempre hi ha un
 *   partit en directe i propers encontres la primera vegada que s'obre l'app.
 *
 * Des de l'admin (Ajustos → "Començar temporada en blanc") es poden esborrar partits i jugadors d'exemple
 * conservant els equips reals.
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

// ───────────────────────── equips ─────────────────────────

interface TeamSeed {
  id: string;
  name: string;
  shortName: string;
  president: string;
  primary: string;
  secondary: string;
  strength: number;
  history: string;
  lleidalitos?: number;
}

const presidedBy = (p: string) => `Equip de la Senior League presidit per ${p}.`;

const TEAM_SEEDS: Record<CategoryId, TeamSeed[]> = {
  // Equips i presidents reals (web antiga). Colors, forces i històries curtes són orientatius.
  senior: [
    { id: 'sen-skull', name: 'Skull FS', shortName: 'SKU', president: 'David Royo', primary: '#E5E7EB', secondary: '#374151', strength: 1.5, lleidalitos: 195, history: presidedBy('David Royo') },
    { id: 'sen-titanes', name: 'Titanes Cafeteros', shortName: 'TIT', president: 'Vladimir García', primary: '#B45309', secondary: '#1C1917', strength: 0.9, lleidalitos: 100, history: presidedBy('Vladimir García') },
    { id: 'sen-tramites', name: 'Trámites Jurídicos Arnao', shortName: 'TJA', president: 'Ivan Fontana', primary: '#2563EB', secondary: '#0B1B4D', strength: 1.2, lleidalitos: 235, history: presidedBy('Ivan Fontana') },
    { id: 'sen-mercury', name: 'Mercury 195', shortName: 'MER', president: 'Kurru Komma', primary: '#94A3B8', secondary: '#1E293B', strength: 0.9, lleidalitos: 155, history: presidedBy('Kurru Komma') },
    { id: 'sen-saintz', name: 'Saintz Strickers', shortName: 'SAI', president: 'Adrià Lapena i Lluís Roige', primary: '#16A34A', secondary: '#052E16', strength: 1.4, lleidalitos: 175, history: presidedBy('Adrià Lapena i Lluís Roige') },
    { id: 'sen-magic', name: 'Magic Salseta FC', shortName: 'MAG', president: 'Serginho', primary: '#DC2626', secondary: '#450A0A', strength: 0.8, lleidalitos: 45, history: presidedBy('Serginho') },
    { id: 'sen-asesoria', name: 'Asesoría Pérez y Mesa', shortName: 'APM', president: 'Hamza', primary: '#7C3AED', secondary: '#2E1065', strength: 1.0, lleidalitos: 215, history: presidedBy('Hamza') },
    { id: 'sen-osmo', name: 'Atlético Osmo', shortName: 'OSM', president: 'Oussama Lamghari i Mohamed Laaraj', primary: '#F97316', secondary: '#431407', strength: 0.7, lleidalitos: 125, history: presidedBy('Oussama Lamghari i Mohamed Laaraj') },
    { id: 'sen-evolution', name: 'Evolution Lleida Futsal', shortName: 'EVO', president: 'Joan Florensa i Roger Lamela', primary: '#10B981', secondary: '#022C22', strength: 1.0, lleidalitos: 35, history: presidedBy('Joan Florensa i Roger Lamela') },
    { id: 'sen-soldados', name: 'Soldados del Asfalto', shortName: 'SDA', president: 'Bruno Tarros', primary: '#CA8A04', secondary: '#1C1917', strength: 0.7, lleidalitos: 45, history: presidedBy('Bruno Tarros') },
    { id: 'sen-grefuso', name: 'Grefuso Team', shortName: 'GRE', president: 'Jordi La Rosa', primary: '#EC4899', secondary: '#500724', strength: 0.85, lleidalitos: 50, history: presidedBy('Jordi La Rosa') },
    { id: 'sen-latoneta', name: 'La Latoneta', shortName: 'LAT', president: 'Albert Latorre «Lato»', primary: '#F59E0B', secondary: '#451A03', strength: 1.3, lleidalitos: 240, history: 'Primer campió de la Lleida League (1a edició, 2023). Presidit per Albert Latorre «Lato».' },
    { id: 'sen-meninos', name: 'Meninos FS', shortName: 'MEN', president: 'Patrick Llusera', primary: '#3B82F6', secondary: '#172554', strength: 1.3, lleidalitos: 215, history: 'Campió de la Senior a la 2a edició (2024) i a la 3a (2025). Presidit per Patrick Llusera.' },
    { id: 'sen-future', name: 'Future Stars', shortName: 'FUT', president: 'Sergi Narbona', primary: '#A855F7', secondary: '#3B0764', strength: 1.4, lleidalitos: 310, history: presidedBy('Sergi Narbona') },
    { id: 'sen-alcotito', name: 'Alcotito FS', shortName: 'ALC', president: 'Gerard Viola i Kenneth', primary: '#14B8A6', secondary: '#042F2E', strength: 1.2, lleidalitos: 220, history: presidedBy('Gerard Viola i Kenneth') },
    { id: 'sen-infumables', name: "I'n Fumables", shortName: 'FUM', president: 'Farrús', primary: '#84CC16', secondary: '#1A2E05', strength: 0.75, lleidalitos: 70, history: presidedBy('Farrús') },
  ],
  // Les altres categories són d'exemple.
  juvenil: [
    { id: 'juv-gardeny', name: 'Gardeny Juniors', shortName: 'GAR', president: 'Laia Segarra', primary: '#F59E0B', secondary: '#1C1917', strength: 1.3, history: 'La pedrera amb més gana de la lliga. Juguen sense por i amb la pissarra apresa de memòria.' },
    { id: 'juv-magraners', name: 'Magraners FS', shortName: 'MAG', president: 'Marc Esteve', primary: '#EF4444', secondary: '#3B0A0A', strength: 1.15, history: 'Vermell magrana i molta barra. Un bloc molt unit que defensa i ataca tots plegats.' },
    { id: 'juv-templers', name: 'Templers Academy', shortName: 'TEM', president: 'Anna Calvet', primary: '#06B6D4', secondary: '#082F49', strength: 1.0, history: 'Disciplina tàctica i pilota aturada. Els entrenadors rivals els estudien amb lupa.' },
    { id: 'juv-horta', name: 'Horta Rockets', shortName: 'HOR', president: 'Pau Miró', primary: '#10B981', secondary: '#022C22', strength: 0.9, history: 'Velocitat pura per banda. Quan encerten són imparables; quan no, riuen igualment.' },
    { id: 'juv-rufea', name: 'Rufea Lions', shortName: 'RUF', president: 'Èric Boldú', primary: '#EAB308', secondary: '#1A1500', strength: 0.8, history: 'Cabellera al vent i caràcter. Una plantilla molt jove que creix partit a partit.' },
    { id: 'juv-noguera', name: 'Noguera Tigers', shortName: 'NOG', president: 'Sara Ibars', primary: '#F97316', secondary: '#1C0F05', strength: 0.7, history: 'Arriben des de la comarca amb ganes de donar la sorpresa. Forts a casa, a prova fora.' },
  ],
  junior: [
    { id: 'jun-balafia', name: 'Balàfia Phoenix', shortName: 'BAL', president: 'Aleix Mateu', primary: '#EF4444', secondary: '#1F0B0B', strength: 1.35, history: 'Ressorgeixen de cada derrota. Intensitat, ritme alt i molta fe en l’últim minut.' },
    { id: 'jun-ciutatjardi', name: 'Ciutat Jardí FS', shortName: 'CIU', president: 'Berta Prat', primary: '#10B981', secondary: '#04201A', strength: 1.15, history: 'Tècnics, descarats i amb un tancament que dirigeix l’orquestra. Gaudeixen jugant.' },
    { id: 'jun-llotja', name: 'Llotja Dragons', shortName: 'LLO', president: 'Gerard Sala', primary: '#8B5CF6', secondary: '#1A1035', strength: 1.0, history: 'Foc a la pista i poques paraules fora d’ella. La seva arma: el 4-0 en moviment.' },
    { id: 'jun-butsenit', name: 'Butsènit Rangers', shortName: 'BUT', president: 'Judit Roca', primary: '#3B82F6', secondary: '#0B1426', strength: 0.9, history: 'Equip de poble gran, treball dur i cames llargues. No regalen ni una pilota.' },
    { id: 'jun-seca', name: 'Secà Sharks', shortName: 'SEC', president: 'Adrià Vilà', primary: '#06B6D4', secondary: '#051B20', strength: 0.8, history: 'Pressionen en grup i ensumen l’error rival. Un equip incòmode per a qualsevol.' },
    { id: 'jun-xalets', name: 'Xalets Blaugrana', shortName: 'XAL', president: 'Roger Font', primary: '#F59E0B', secondary: '#1B1204', strength: 0.7, history: 'Molt de cor, molt de color i una afició que viatja a tots els pavellons.' },
  ],
  femenina: [
    { id: 'fem-valkyries', name: 'Valkyries FS', shortName: 'VAL', president: 'Irene Montoya', primary: '#EC4899', secondary: '#2A0F20', strength: 1.4, history: 'Les campiones a batre. Molt de talent, molta pissarra i la millor parella ala-pivot de la lliga.' },
    { id: 'fem-cappontqueens', name: 'Cappont Queens', shortName: 'CQU', president: 'Mireia Pujol', primary: '#F59E0B', secondary: '#1C1304', strength: 1.2, history: 'Reines del toc i la combinació. El seu joc associatiu és un espectacle en pista curta.' },
    { id: 'fem-lionesses', name: 'Barris Nord Lionesses', shortName: 'BNL', president: 'Carla Domènech', primary: '#EF4444', secondary: '#220808', strength: 1.05, history: 'Garra i caràcter. Les lleones mai donen una pilota per perduda i ho celebren a lo gran.' },
    { id: 'fem-amazons', name: 'Mariola Amazons', shortName: 'AMA', president: 'Èlia Costa', primary: '#10B981', secondary: '#04201A', strength: 0.9, history: 'Ràpides i valentes. S’atreveixen amb tot, fins i tot amb les que van primeres.' },
    { id: 'fem-foxes', name: 'Horta Foxes', shortName: 'FOX', president: 'Ona Lladó', primary: '#F97316', secondary: '#1C0F05', strength: 0.8, history: 'Astutes i letals al contraatac. Sempre troben l’espai que ningú no veu.' },
    { id: 'fem-eagles', name: 'Seu Vella Eagles', shortName: 'EAG', president: 'Aina Peris', primary: '#3B82F6', secondary: '#0B1426', strength: 0.7, history: 'Visió de joc des de les altures. Un equip en construcció amb una pedrera prometedora.' },
  ],
};

// ───────────────────────── jugadors (exemple) ─────────────────────────

const MALE_FIRST = ['Marc', 'Pau', 'Jordi', 'Oriol', 'Arnau', 'Joan', 'Biel', 'Pol', 'Èric', 'Ferran', 'Xavier', 'Albert', 'Adrià', 'Guillem', 'Roger', 'Nil', 'Aleix', 'Sergi', 'Marcel', 'Iván', 'Dani', 'Carles', 'Joel', 'Àlex', 'Víctor', 'Raül', 'Gerard', 'Ramon', 'Quim', 'Isaac', 'Hugo', 'Mateo', 'Samuel', 'Yassine', 'Karim', 'Brais', 'Nacho', 'Rubén', 'Cristian', 'Jaume', 'Lluc', 'Martí', 'Genís', 'Abel', 'Eloi', 'Bruno', 'Dídac', 'Ismael', 'Moha', 'Toni'];
const FEMALE_FIRST = ['Núria', 'Laia', 'Marta', 'Júlia', 'Aina', 'Carla', 'Mireia', 'Berta', 'Clàudia', 'Paula', 'Anna', 'Sara', 'Judit', 'Èlia', 'Irene', 'Maria', 'Alba', 'Ona', 'Mar', 'Marina', 'Gemma', 'Eva', 'Cristina', 'Noa', 'Sílvia', 'Queralt', 'Neus', 'Rosa', 'Lucía', 'Sofía', 'Aitana', 'Nerea', 'Leire', 'Aroa', 'Xènia', 'Abril', 'Triana', 'Emma', 'Vera', 'Mònica'];
const SURNAMES = ['Puig', 'Ribera', 'Soler', 'Vidal', 'Roca', 'Ferrer', 'Mas', 'Pons', 'Serra', 'Casals', 'Camps', 'Bosch', 'Farré', 'Pujol', 'Vilà', 'Sala', 'Prat', 'Font', 'Rovira', 'Montoya', 'García', 'Martínez', 'López', 'Sánchez', 'Gómez', 'Navarro', 'Torres', 'Domènech', 'Costa', 'Lladó', 'Gené', 'Closa', 'Tarrés', 'Esteve', 'Mateu', 'Bellmunt', 'Segarra', 'Miró', 'Calvet', 'Orriols', 'Boldú', 'Ibars', 'Agramunt', 'Gilabert', 'Bernaus', 'Sans', 'Oliva', 'Peris', 'Ortiz', 'Benali', 'Diallo', 'Rodrigues', 'Cuadrado', 'Alsina', 'Garrofé', 'Capdevila', 'Maldonado', 'Baró'];

const NICKNAMES: Record<Position, string[]> = {
  Portero: ['El Mur', 'Gatet', 'Pop', 'Mans', 'Spiderman'],
  Cierre: ['El General', 'Cervell', 'Pilar', 'Capi', 'Brúixola'],
  Ala: ['Flash', 'El Coet', 'Mosca', 'Llamp', 'Bala', 'Esquerrà'],
  Pívot: ['El Tanc', 'Torre', 'Martell', 'Rinoceront', 'Killer'],
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

// ───────────────────────── partits (exemple) ─────────────────────────

const GENERIC_VENUES = ['Pavelló Barris Nord', 'Pavelló Onze de Setembre', 'Pavelló Cappont', 'Pavelló Pardinyes', 'Pavelló La Mariola'];
// Pavellons on s'han jugat les primeres edicions (web antiga) — editables des de l'admin.
const SENIOR_VENUES = ['Pavelló Manel Bosch (Torrefarrera)', 'Pavelló de Pardinyes'];

interface CategorySchedule {
  finishedMatchdays: number;
  /** Days from today to the current matchday (only for categories with fixed time slots). */
  offsetDays: number;
  slots: string[];
  doubleRound: boolean;
  venues: string[];
}

const SCHEDULE: Record<CategoryId, CategorySchedule> = {
  senior: { finishedMatchdays: 6, offsetDays: 0, slots: ['19:00', '20:00', '21:00', '22:00'], doubleRound: false, venues: SENIOR_VENUES },
  juvenil: { finishedMatchdays: 5, offsetDays: 2, slots: ['10:00', '11:30', '13:00'], doubleRound: true, venues: GENERIC_VENUES },
  junior: { finishedMatchdays: 4, offsetDays: 3, slots: ['17:00', '18:30', '20:00'], doubleRound: true, venues: GENERIC_VENUES },
  femenina: { finishedMatchdays: 5, offsetDays: 1, slots: ['11:00', '12:30', '14:00'], doubleRound: true, venues: GENERIC_VENUES },
};

const CAT_CODE: Record<CategoryId, string> = { senior: 'sen', juvenil: 'juv', junior: 'jun', femenina: 'fem' };

function roundRobin(ids: string[], doubleRound: boolean): [string, string][][] {
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
  if (!doubleRound) return first;
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
    const rounds = roundRobin(ids, cfg.doubleRound);
    const currentMd = cfg.finishedMatchdays + 1;
    const perCourt = cfg.slots.length;

    rounds.forEach((pairs, roundIdx) => {
      const md = roundIdx + 1;
      pairs.forEach(([homeId, awayId], idx) => {
        const id = `m-${CAT_CODE[cat]}-${String(md).padStart(2, '0')}-${idx + 1}`;
        const court = Math.floor(idx / perCourt);
        const slot = idx % perCourt;
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
          venue: cfg.venues[(court + roundIdx) % cfg.venues.length],
          events: [],
        };

        const isSeniorCurrent = cat === 'senior' && md === currentMd;
        let kickoff: Date;
        if (isSeniorCurrent) {
          // Jornada "en marxa": un partit acabat, un en directe i la resta a punt de començar (per pista).
          const offsetsMin = [-110, -20, 70, 160];
          kickoff = roundTo5(new Date(now.getTime() + offsetsMin[slot % offsetsMin.length] * 60_000));
        } else {
          const day = addDays(today, cfg.offsetDays + (md - currentMd) * 7);
          const [hh, mm] = cfg.slots[slot].split(':').map(Number);
          kickoff = new Date(day.getFullYear(), day.getMonth(), day.getDate(), hh, mm);
        }
        base.date = toISODate(kickoff);
        base.time = toTimeString(kickoff);

        const isLive = isSeniorCurrent && slot === 1;
        const isFinished = md <= cfg.finishedMatchdays || (isSeniorCurrent && slot === 0);

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

// ───────────────────────── galeria, notícies, club ─────────────────────────

const photo = (id: string, w = 900) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=70`;
/** Imatges de la web antiga (hostatjades a Wix) — "fit" manté la proporció original. */
const wix = (uri: string, file: string, w = 900, h = 900) => `https://static.wixstatic.com/media/${uri}/v1/fit/w_${w},h_${h},q_80/${file}`;

function buildGallery(now: Date): GalleryItem[] {
  const day = (back: number) => toISODate(addDays(now, -back));
  const grada = (uri: string, file: string) => wix(uri, file);
  const items: Omit<GalleryItem, 'id'>[] = [
    { title: 'Nit de focus a Cappont', matchday: 6, imageUrl: photo('1431324155629-1a6deb1dec8d'), category: 'senior', date: day(1), caption: 'Els focus s’encenen i el pavelló fa olor de derbi.', tags: ['ambient', 'senior'] },
    { title: 'La pilota de la jornada', matchday: 6, imageUrl: photo('1486286701208-1d58e9338013'), category: 'senior', date: day(1), caption: 'La pilota oficial de la Lleida League, a punt per a una altra batalla presidencial.', tags: ['pilota', 'oficial'] },
    { title: 'Duel a mitja pista', matchday: 5, imageUrl: photo('1553778263-73a83bab9b0c'), category: 'senior', date: day(8), caption: 'Cama forta i pilota dividida: així es guanya una jornada.', tags: ['acció', 'senior'] },
    { title: 'Xut de bandera', matchday: 5, imageUrl: photo('1517466787929-bc90951d0974'), category: 'juvenil', teamId: 'juv-gardeny', date: day(8), caption: 'La pedrera també sap de remats impossibles.', tags: ['acció', 'juvenil'] },
    { title: 'Concentració abans del xiulet', matchday: 4, imageUrl: photo('1574629810360-7efbbe195018'), category: 'junior', teamId: 'jun-balafia', date: day(15), caption: 'Última ullada a la pilota abans de començar el partit.', tags: ['prèvia', 'junior'] },
    { title: 'Entrenament a porta tancada', matchday: 3, imageUrl: photo('1518604666860-9ed391f76460'), category: 'femenina', teamId: 'fem-valkyries', date: day(22), caption: 'Les Valkyries preparen el derbi amb pilotes per tot arreu.', tags: ['entrenament', 'femenina'] },
    { title: 'Línia de banda', matchday: 3, imageUrl: photo('1459865264687-595d652de67e'), category: 'general', date: day(22), caption: 'On comença tot: la línia, la gespa i el xiulet.', tags: ['pista'] },
    { title: 'Esperant el xiulet', matchday: 2, imageUrl: photo('1551958219-acbc608c6377'), category: 'junior', date: day(29), caption: 'Tres pilotes, un sol campió.', tags: ['pilota', 'junior'] },
    { title: 'Botes de campiona', matchday: 2, imageUrl: photo('1579952363873-27f3bade9f55'), category: 'femenina', date: day(29), caption: 'Ajustant els tacs abans del xiulet inicial.', tags: ['prèvia', 'femenina'] },
    { title: 'Remat a l’aire', matchday: 1, imageUrl: photo('1560272564-c83b66b1ad12'), category: 'senior', date: day(36), caption: 'La primera jornada ja va deixar imatges per al record.', tags: ['acció', 'inici'] },
    { title: 'Pista sota les estrelles', matchday: 1, imageUrl: photo('1487466365202-1afdb86c764e'), category: 'general', date: day(36), caption: 'La lliga arrenca en una nit de gala.', tags: ['ambient', 'inici'] },
    { title: 'Córner i estratègia', matchday: 4, imageUrl: photo('1529900748604-07564a03e7a6'), category: 'juvenil', teamId: 'juv-templers', date: day(15), caption: 'Els Templers estudien el córner abans d’executar-lo.', tags: ['tàctica', 'juvenil'] },
    // La Nostra Grada (fotos reals de la web antiga)
    { title: 'La nostra grada', imageUrl: grada('87d961_cd116ae5162a4a25a6e1bcd6bb12e2da~mv2.jpg', 'grada-1.jpg'), category: 'general', date: day(40), caption: 'La nostra grada és l’ànima del torneig, on cada partit es converteix en un espectacle únic!', tags: ['grada'] },
    { title: 'La nostra grada', imageUrl: grada('87d961_2c3efe6ba9914c02b01d4b47013f455e~mv2.jpg', 'grada-2.jpg'), category: 'general', date: day(40), caption: 'Cada partit, una festa a les graderies.', tags: ['grada'] },
    { title: 'La nostra grada', imageUrl: grada('87d961_bc337500b1314f2a861d2b1d485932bc~mv2.jpg', 'grada-3.jpg'), category: 'general', date: day(40), caption: 'L’afició és el jugador número sis.', tags: ['grada'] },
    { title: 'La nostra grada', imageUrl: grada('87d961_14befa267e2f46e597cf083a0abbfc06~mv2.jpg', 'grada-4.jpg'), category: 'general', date: day(40), caption: 'Colors, cants i molta passió.', tags: ['grada'] },
    { title: 'La nostra grada', imageUrl: grada('87d961_38fbdbd9d3fe4381ae53f740c2dc97c5~mv2.jpg', 'grada-5.jpg'), category: 'general', date: day(40), caption: 'Sense afició no hi ha batalla presidencial.', tags: ['grada'] },
    { title: 'La nostra grada', imageUrl: grada('87d961_f6e5b6693a744da786439743bc210cc8~mv2.jpg', 'grada-6.jpg'), category: 'general', date: day(40), caption: 'Un pavelló ple, un ambient únic.', tags: ['grada'] },
    { title: 'La nostra grada', imageUrl: grada('87d961_6315aa79abdd44abb1b21a5364aea559~mv2.jpg', 'grada-7.jpg'), category: 'general', date: day(40), caption: 'Gràcies per ser l’ànima del torneig.', tags: ['grada'] },
  ];
  return items.map((it, i) => ({ id: `g-${String(i + 1).padStart(2, '0')}`, ...it }));
}

function buildNews(teams: Team[], now: Date): NewsItem[] {
  const name = (id: string) => teams.find((t) => t.id === id)?.name ?? id;
  const day = (back: number) => toISODate(addDays(now, -back));
  return [
    { id: 'n-01', headline: 'Arrenca la jornada 7 de la Senior: tots els partits, en directe', summary: 'Segueix els marcadors en directe, les cròniques i els presidents a la grada. Cada gol canvia la classificació al moment.', date: day(0), badge: 'Oficial', category: 'senior' },
    { id: 'n-02', headline: 'S’obre el mercat: els presidents mouen fitxa', summary: 'Els equips ja poden negociar reforços per al tram decisiu. El termini de fitxatges tanca la setmana vinent.', date: day(2), badge: 'Mercat' },
    { id: 'n-03', headline: 'El Comitè sanciona amb dos partits una conducta antiesportiva', summary: 'Després de revisar l’acta de l’última jornada, el Comitè de Competició castiga un jugador amb dos partits de suspensió.', date: day(3), badge: 'Sanció', category: 'senior' },
    { id: 'n-04', headline: 'Femenina League: rècord d’assistència a la jornada 5', summary: `El derbi entre ${name('fem-valkyries')} i ${name('fem-cappontqueens')} va omplir el pavelló i va marcar el rècord de públic de la temporada.`, date: day(5), badge: 'Oficial', category: 'femenina' },
    { id: 'n-05', headline: 'Nou premi presidencial: MVP de cada jornada', summary: 'L’organització premiarà el millor jugador de cada jornada amb la targeta daurada i una menció especial a les xarxes de la lliga.', date: day(9), badge: 'Oficial' },
    { id: 'n-06', headline: 'Fitxatge sorpresa a la Junior League', summary: `${name('jun-llotja')} reforça la seva línia ofensiva amb una ala esquerrana procedent de la pedrera local. Debutarà a la propera jornada.`, date: day(11), badge: 'Mercat', category: 'junior' },
  ];
}

const CHAMPIONS: Omit<Champion, 'id'>[] = [
  { category: 'senior', edition: 1, year: 2023, team: 'La Latoneta' },
  { category: 'senior', edition: 2, year: 2024, team: 'Meninos' },
  { category: 'senior', edition: 3, year: 2025, team: 'Meninos' },
  { category: 'femenina', edition: 1, year: 2025, team: 'Las Ploff' },
  { category: 'juvenil', edition: 1, year: 2025, team: 'Los Miuras' },
  { category: 'junior', edition: 1, year: 2024, team: 'Gold Strikers Jr' },
  { category: 'junior', edition: 2, year: 2025, team: 'Kiko FC' },
];

const SPONSORS: Omit<Sponsor, 'id'>[] = [
  { name: 'Restaurant La Trattoria', url: 'https://www.facebook.com/restaurantepizzerialatrattoria', logoUrl: wix('87d961_33414993403b45f5a781520cf5795b22~mv2.png', 'la-trattoria.png', 480, 360) },
  { name: 'Grúas Cerezo Liebherr', url: 'https://cerezo.net', logoUrl: wix('87d961_47083f7458004afbb9280c561ecd88ef~mv2.jpg', 'cerezo.jpg', 480, 360) },
  { name: 'Sporticus', url: 'https://sporticusfisio.com', logoUrl: wix('87d961_5ef6ffc0c4bb48a4a7191d162e5015fe~mv2.png', 'sporticus.png', 480, 360) },
  { name: 'Petit Sam', logoUrl: wix('87d961_651379ad178f4f0fa435ebd0ee74ada7~mv2.jpg', 'petit-sam.jpg', 480, 360) },
  { name: 'Coca-Cola', url: 'https://www.coca-cola.com/es/es', logoUrl: wix('87d961_29d1d22b732d40229ac985937e7d3364~mv2.png', 'coca-cola.png', 480, 360) },
  { name: 'Park Aventura Lleida', url: 'https://www.parkaventuralleida.com', logoUrl: wix('87d961_7e2e81cfb03249b398eb8a3d6c02ed99~mv2.png', 'park-aventura.png', 480, 360) },
  { name: 'Ve de Gust', logoUrl: wix('87d961_bec0542fdad74d1b955da104b30ac826~mv2.jpg', 've-de-gust.jpg', 480, 360) },
  { name: 'Solo Trofeos', url: 'https://www.solotrofeos.com', logoUrl: wix('87d961_2be210ef786444a4aeba2bde58868a7f~mv2.png', 'solo-trofeos.png', 480, 360) },
  { name: 'Ceform College', url: 'https://www.ceformcollege.com', logoUrl: wix('87d961_1c2ceeac40194325b7479a69fb393534~mv2.png', 'ceform.png', 480, 360) },
];

const REFEREES: Omit<Referee, 'id'>[] = [
  { name: 'Pau Dueñas', role: 'Àrbitre CTAFS' },
  { name: 'Bernabé Martínez', role: 'Àrbitre CTAFS' },
  { name: 'Adrià Ruiz', role: 'Àrbitre CTAFS' },
];

// ───────────────────────── API pública ─────────────────────────

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
      ...(t.lleidalitos !== undefined ? { lleidalitos: t.lleidalitos } : {}),
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
    champions: CHAMPIONS.map((c, i) => ({ id: `c-${i + 1}`, ...c })),
    sponsors: SPONSORS.map((s, i) => ({ id: `s-${i + 1}`, ...s })),
    referees: REFEREES.map((ref, i) => ({ id: `r-${i + 1}`, ...ref })),
    settings: DEFAULT_SETTINGS,
  };
}
