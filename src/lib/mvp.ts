import { useEffect, useState } from 'react';
import { create } from 'zustand';
import type { Player, Position, Team } from '@/types';
import { getSupabase, supabaseEnabled, supabaseRest } from '@/lib/supabase';
import { uid } from '@/lib/utils';

/**
 * Public MVP vote. With Supabase: `mvp_polls` (admins open/close them) + `mvp_votes` (anyone votes once while open)
 * + `mvp_tally()` for the results. Without Supabase everything lives in this browser (enough to try it out).
 */

export interface MvpCandidate {
  id: string;
  name: string;
  nickname?: string;
  dorsal: number;
  position: Position;
  photoUrl: string;
  teamId: string;
  teamName: string;
  teamShort: string;
  primaryColor: string;
  secondaryColor: string;
  logoUrl: string;
  /** Prediction ("porra") answer instead of a player: shown as a team crest or a plain option. */
  option?: boolean;
}

export interface MvpPoll {
  id: string;
  matchId: string | null;
  title: string;
  candidates: MvpCandidate[];
  status: 'open' | 'closed';
  createdAt: string;
}

export type Tally = Record<string, number>;

export const candidateOf = (p: Player, t: Team): MvpCandidate => ({
  id: p.id,
  name: p.name,
  nickname: p.nickname,
  dorsal: p.dorsal,
  position: p.position,
  photoUrl: p.photoUrl,
  teamId: t.id,
  teamName: t.name,
  teamShort: t.shortName,
  primaryColor: t.primaryColor,
  secondaryColor: t.secondaryColor,
  logoUrl: t.logoUrl,
});

/** One answer of a live prediction. With a team it shows that team's crest and colours. */
export const optionCandidate = (id: string, label: string, color: string, team?: Pick<Team, 'id' | 'name' | 'shortName' | 'primaryColor' | 'secondaryColor' | 'logoUrl'>): MvpCandidate => ({
  id,
  name: label,
  dorsal: 0,
  position: 'Ala',
  photoUrl: '',
  teamId: team?.id ?? id,
  teamName: team?.name ?? label,
  teamShort: team?.shortName ?? label,
  primaryColor: team?.primaryColor ?? color,
  secondaryColor: team?.secondaryColor ?? '#0f172a',
  logoUrl: team?.logoUrl ?? '',
  option: true,
});

/** A live prediction ("porra") rather than the MVP vote. */
export const isPrediction = (p: Pick<MvpPoll, 'candidates'> | null | undefined) => !!p?.candidates.some((c) => c.option);

/** An option tied to a real team shows its crest; "Draw", "Nobody"… show their text. */
export const optionHasTeam = (c: MvpCandidate) => c.option && c.teamId !== c.id;

/** Team-like object for <TeamCrest/> / <PlayerAvatar/>. */
export const candidateTeam = (c: MvpCandidate) => ({ name: c.teamName, shortName: c.teamShort, primaryColor: c.primaryColor, secondaryColor: c.secondaryColor, logoUrl: c.logoUrl });

export const voteUrl = () => `${window.location.origin}/vota`;

// ───────────────────────── storage helpers ─────────────────────────

const LOCAL_POLLS = 'lleida-league:mvp-polls';
const LOCAL_VOTES = 'lleida-league:mvp-votes';
const MY_VOTES = 'lleida-league:mvp-my-votes';
const VOTER = 'lleida-league:voter';

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage blocked */
  }
}

function voterId() {
  let id = readJson<string>(VOTER, '');
  if (!id) {
    id = (crypto.randomUUID?.() ?? uid('voter')).replace(/[^a-z0-9-]/gi, '');
    writeJson(VOTER, id);
  }
  return id;
}

export const myVote = (pollId: string): string | null => readJson<Record<string, string>>(MY_VOTES, {})[pollId] ?? null;
const rememberVote = (pollId: string, playerId: string) => writeJson(MY_VOTES, { ...readJson<Record<string, string>>(MY_VOTES, {}), [pollId]: playerId });

const headers = (): Record<string, string> => {
  const key = supabaseRest.key ?? '';
  return key.startsWith('eyJ') ? { apikey: key, Authorization: `Bearer ${key}` } : { apikey: key };
};

interface PollRow {
  id: string;
  match_id: string | null;
  title: string;
  candidates: MvpCandidate[];
  status: 'open' | 'closed';
  created_at: string;
}

const fromRow = (r: PollRow): MvpPoll => ({ id: r.id, matchId: r.match_id, title: r.title, candidates: r.candidates ?? [], status: r.status, createdAt: r.created_at });

// ───────────────────────── reads (anyone) ─────────────────────────

export async function fetchPoll(id: string): Promise<MvpPoll | null> {
  if (!supabaseEnabled) return readJson<MvpPoll[]>(LOCAL_POLLS, []).find((p) => p.id === id) ?? null;
  const res = await fetch(`${supabaseRest.url}/rest/v1/mvp_polls?id=eq.${encodeURIComponent(id)}&select=*`, { headers: headers(), cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const rows = (await res.json()) as PollRow[];
  return rows[0] ? fromRow(rows[0]) : null;
}

/** Most recent open poll, if any. */
export async function fetchOpenPoll(): Promise<MvpPoll | null> {
  if (!supabaseEnabled) {
    return (
      readJson<MvpPoll[]>(LOCAL_POLLS, [])
        .filter((p) => p.status === 'open')
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] ?? null
    );
  }
  const res = await fetch(`${supabaseRest.url}/rest/v1/mvp_polls?status=eq.open&select=*&order=created_at.desc&limit=1`, { headers: headers(), cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const rows = (await res.json()) as PollRow[];
  return rows[0] ? fromRow(rows[0]) : null;
}

export async function fetchTally(pollId: string): Promise<Tally> {
  if (!supabaseEnabled) {
    const votes = readJson<{ pollId: string; playerId: string }[]>(LOCAL_VOTES, []);
    const t: Tally = {};
    for (const v of votes) if (v.pollId === pollId) t[v.playerId] = (t[v.playerId] ?? 0) + 1;
    return t;
  }
  const res = await fetch(`${supabaseRest.url}/rest/v1/rpc/mvp_tally`, {
    method: 'POST',
    headers: { ...headers(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_poll: pollId }),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const rows = (await res.json()) as { player_id: string; votes: number }[];
  return Object.fromEntries(rows.map((r) => [r.player_id, Number(r.votes)]));
}

// ───────────────────────── voting (anyone) ─────────────────────────

export type VoteOutcome = 'ok' | 'already' | 'closed' | 'error';

export async function castVote(poll: MvpPoll, playerId: string): Promise<VoteOutcome> {
  if (myVote(poll.id)) return 'already';
  if (!supabaseEnabled) {
    const current = readJson<MvpPoll[]>(LOCAL_POLLS, []).find((p) => p.id === poll.id);
    if (!current || current.status !== 'open') return 'closed';
    writeJson(LOCAL_VOTES, [...readJson<{ pollId: string; playerId: string }[]>(LOCAL_VOTES, []), { pollId: poll.id, playerId }]);
    rememberVote(poll.id, playerId);
    return 'ok';
  }
  try {
    const res = await fetch(`${supabaseRest.url}/rest/v1/mvp_votes`, {
      method: 'POST',
      headers: { ...headers(), 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({ poll_id: poll.id, voter: voterId(), player_id: playerId }),
    });
    if (res.ok) {
      rememberVote(poll.id, playerId);
      return 'ok';
    }
    if (res.status === 409) {
      rememberVote(poll.id, playerId);
      return 'already';
    }
    // RLS rejects votes once the poll is closed.
    if (res.status === 401 || res.status === 403) return 'closed';
    return 'error';
  } catch {
    return 'error';
  }
}

// ───────────────────────── admin ─────────────────────────

export async function openPoll(input: { matchId: string | null; title: string; candidates: MvpCandidate[] }): Promise<MvpPoll> {
  const poll: MvpPoll = { id: uid('mvp'), matchId: input.matchId, title: input.title, candidates: input.candidates, status: 'open', createdAt: new Date().toISOString() };
  if (!supabaseEnabled) {
    // Only one open poll at a time.
    const others = readJson<MvpPoll[]>(LOCAL_POLLS, []).map((p) => (p.status === 'open' ? { ...p, status: 'closed' as const } : p));
    writeJson(LOCAL_POLLS, [poll, ...others].slice(0, 30));
    return poll;
  }
  const sb = await getSupabase();
  await sb.from('mvp_polls').update({ status: 'closed', closed_at: new Date().toISOString() }).eq('status', 'open');
  const { error } = await sb.from('mvp_polls').insert({ id: poll.id, match_id: poll.matchId, title: poll.title, candidates: poll.candidates, status: 'open' });
  if (error) throw new Error(friendly(error.message, error.code));
  return poll;
}

export async function setPollStatus(id: string, status: 'open' | 'closed') {
  if (!supabaseEnabled) {
    writeJson(
      LOCAL_POLLS,
      readJson<MvpPoll[]>(LOCAL_POLLS, []).map((p) => (p.id === id ? { ...p, status } : status === 'open' && p.status === 'open' ? { ...p, status: 'closed' as const } : p)),
    );
    return;
  }
  const sb = await getSupabase();
  if (status === 'open') await sb.from('mvp_polls').update({ status: 'closed', closed_at: new Date().toISOString() }).eq('status', 'open');
  const { error } = await sb.from('mvp_polls').update({ status, closed_at: status === 'closed' ? new Date().toISOString() : null }).eq('id', id);
  if (error) throw new Error(friendly(error.message, error.code));
}

function friendly(message: string, code?: string) {
  if (code === '42P01' || code === 'PGRST205' || /does not exist|could not find the table/i.test(message)) return 'Falten les taules de la votació a Supabase: executa l’SQL actualitzat (supabase/schema.sql).';
  if (code === '42501' || /row-level security/i.test(message)) return 'Sense permís: torna a iniciar sessió com a administrador.';
  return message;
}

// ───────────────────────── hooks ─────────────────────────

interface OpenPollStore {
  poll: MvpPoll | null;
  refresh: () => Promise<void>;
}

/** One shared poller for the whole site (home banner, match sheet, vote page). */
export const useOpenPollStore = create<OpenPollStore>()((set) => ({
  poll: null,
  refresh: async () => {
    try {
      set({ poll: await fetchOpenPoll() });
    } catch {
      /* table missing / offline: simply no poll */
    }
  },
}));

let watchers = 0;
let timer = 0;

export function useOpenPoll(): MvpPoll | null {
  const poll = useOpenPollStore((s) => s.poll);
  useEffect(() => {
    watchers++;
    if (watchers === 1) {
      void useOpenPollStore.getState().refresh();
      timer = window.setInterval(() => void useOpenPollStore.getState().refresh(), 15_000);
    }
    return () => {
      watchers--;
      if (watchers === 0) window.clearInterval(timer);
    };
  }, []);
  return poll;
}

/** Live results of a poll (refreshes every `intervalMs`). */
export function useTally(pollId: string | null | undefined, intervalMs = 4000): Tally {
  const [tally, setTally] = useState<Tally>({});
  useEffect(() => {
    if (!pollId) {
      setTally({});
      return;
    }
    let alive = true;
    const load = () =>
      fetchTally(pollId)
        .then((t) => alive && setTally(t))
        .catch(() => {});
    void load();
    const id = window.setInterval(load, intervalMs);
    // Same-browser votes (local mode / testing) update at once.
    const onStorage = (e: StorageEvent) => e.key === LOCAL_VOTES && void load();
    window.addEventListener('storage', onStorage);
    return () => {
      alive = false;
      window.clearInterval(id);
      window.removeEventListener('storage', onStorage);
    };
  }, [pollId, intervalMs]);
  return tally;
}

export function ranked(poll: MvpPoll, tally: Tally) {
  const total = Object.values(tally).reduce((a, b) => a + b, 0);
  // Ties: players alphabetically, prediction answers in the order they were asked (home, draw, away…).
  const rows = poll.candidates
    .map((c, i) => ({ c, i, votes: tally[c.id] ?? 0 }))
    .sort((a, b) => b.votes - a.votes || (a.c.option ? a.i - b.i : a.c.name.localeCompare(b.c.name, 'es')))
    .map((r) => ({ ...r, pct: total ? Math.round((r.votes / total) * 100) : 0 }));
  return { rows, total };
}
