import type { CategoryId } from '@/types';
import { getSupabase, supabaseEnabled } from '@/lib/supabase';
import { blobToDataUrl, loadImage, shrink, uploadImage } from '@/lib/upload';
import { uid } from '@/lib/utils';

/**
 * Team registration by the presidents ("inscripció d'equips").
 * Each president gets a login from the organization and fills in ONLY their team: crest, president, players
 * (public face photo + private ID document), and the signed image-rights paper. Admins review and approve it,
 * which adds the team and its players to the league.
 *
 * Supabase: table `registrations` (one row per president e-mail) + public bucket `fotos` + private bucket `privat`.
 * Local mode (no Supabase): everything lives in this browser — only for trying it out.
 */

export type RegStatus = 'draft' | 'submitted' | 'changes' | 'approved';
export type RegRole = 'porter' | 'jugador';

export interface RegPlayer {
  id: string;
  firstName: string;
  lastName: string;
  /** Optional name on the jersey / graphics. */
  nickname: string;
  dorsal: number | null;
  role: RegRole;
  /** `YYYY-MM-DD`. */
  birthDate: string;
  captain: boolean;
  /** Public face photo, ID-card style (3:4). */
  photoUrl: string;
  /** Private path of the ID document picture (only the president and the organization can see it). */
  dniPath: string;
  /** The organization checked the age and deleted the ID picture. */
  dniChecked?: boolean;
}

export interface RegData {
  team: { name: string; shortName: string; logoUrl: string; primaryColor: string; secondaryColor: string };
  president: { name: string; phone: string; photoUrl: string };
  players: RegPlayer[];
  /** Private paths of the signed image-rights papers (photos or PDF). */
  rightsDocs: string[];
  confirm: { truth: boolean; rights: boolean };
}

export interface Registration {
  email: string;
  category: CategoryId;
  status: RegStatus;
  data: RegData;
  adminNote: string;
  teamId: string | null;
  createdAt: string;
  updatedAt: string;
}

export const MIN_PLAYERS = 5;
export const MAX_PLAYERS = 20;

export const STATUS_LABEL: Record<RegStatus, string> = {
  draft: 'Esborrany',
  submitted: 'Enviada · per revisar',
  changes: 'Cal corregir-la',
  approved: 'Aprovada',
};

export const emptyData = (): RegData => ({
  team: { name: '', shortName: '', logoUrl: '', primaryColor: '#F59E0B', secondaryColor: '#111827' },
  president: { name: '', phone: '', photoUrl: '' },
  players: [],
  rightsDocs: [],
  confirm: { truth: false, rights: false },
});

/** Tolerates rows saved by older versions (or an empty `{}` from a new account). */
export function normalizeData(raw: unknown): RegData {
  const base = emptyData();
  const d = (raw && typeof raw === 'object' ? raw : {}) as Partial<RegData>;
  return {
    team: { ...base.team, ...(d.team ?? {}) },
    president: { ...base.president, ...(d.president ?? {}) },
    players: Array.isArray(d.players) ? d.players.map((p) => ({ ...newPlayer(), ...p })) : [],
    rightsDocs: Array.isArray(d.rightsDocs) ? d.rightsDocs : [],
    confirm: { ...base.confirm, ...(d.confirm ?? {}) },
  };
}

export const newPlayer = (): RegPlayer => ({
  id: uid('pl'),
  firstName: '',
  lastName: '',
  nickname: '',
  dorsal: null,
  role: 'jugador',
  birthDate: '',
  captain: false,
  photoUrl: '',
  dniPath: '',
});

export const fullName = (p: Pick<RegPlayer, 'firstName' | 'lastName'>) => `${p.firstName.trim()} ${p.lastName.trim()}`.trim();

/** Age in whole years on `at` (default: today), or null without a valid date. */
export function ageOf(birthDate: string, at = new Date()): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthDate);
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  let age = at.getFullYear() - y;
  if (at.getMonth() + 1 < mo || (at.getMonth() + 1 === mo && at.getDate() < d)) age--;
  return age >= 0 && age < 100 ? age : null;
}

export const isMinor = (p: RegPlayer) => {
  const a = ageOf(p.birthDate);
  return a !== null && a < 18;
};

/** What is still missing for one player (empty = complete). */
export function playerIssues(p: RegPlayer, all: RegPlayer[]): string[] {
  const out: string[] = [];
  if (!p.firstName.trim() || !p.lastName.trim()) out.push('nom i cognoms');
  if (p.dorsal === null) out.push('dorsal');
  else if (all.some((o) => o.id !== p.id && o.dorsal === p.dorsal)) out.push(`dorsal ${p.dorsal} repetit`);
  if (ageOf(p.birthDate) === null) out.push('data de naixement');
  if (!p.photoUrl) out.push('foto de cara');
  if (!p.dniPath && !p.dniChecked) out.push('foto del DNI');
  return out;
}

/** Everything still missing before the registration can be sent. */
export function regIssues(d: RegData): string[] {
  const out: string[] = [];
  if (!d.team.name.trim()) out.push('El nom de l’equip');
  if (d.team.shortName.trim().length < 2) out.push('Les sigles de l’equip (3 lletres)');
  if (!d.team.logoUrl) out.push('L’escut de l’equip');
  if (!d.president.name.trim()) out.push('El nom del president');
  if (d.president.phone.replace(/\D/g, '').length < 9) out.push('El telèfon del president');
  if (d.players.length < MIN_PLAYERS) out.push(`Com a mínim ${MIN_PLAYERS} jugadors (n’hi ha ${d.players.length})`);
  if (d.players.length > MAX_PLAYERS) out.push(`Com a màxim ${MAX_PLAYERS} jugadors`);
  if (d.players.length && !d.players.some((p) => p.role === 'porter')) out.push('Com a mínim un porter');
  const incomplete = d.players.filter((p) => playerIssues(p, d.players).length);
  if (incomplete.length) out.push(`${incomplete.length} ${incomplete.length === 1 ? 'jugador té' : 'jugadors tenen'} dades per completar`);
  if (!d.rightsDocs.length) out.push('El document de drets d’imatge signat');
  if (!d.confirm.truth || !d.confirm.rights) out.push('Les dues confirmacions del final');
  return out;
}

/** Readable password to send by WhatsApp: no look-alike characters (0/O, 1/l/I). */
export function generatePassword(): string {
  const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  const s = Array.from(bytes, (b) => chars[b % chars.length]).join('');
  return `${s.slice(0, 4)}-${s.slice(4, 8)}-${s.slice(8, 12)}`;
}

export const season = (d = new Date()) => {
  const y = d.getMonth() >= 7 ? d.getFullYear() : d.getFullYear() - 1;
  return `${y}-${String((y + 1) % 100).padStart(2, '0')}`;
};

// ───────────────────────── Face photo (ID-card style) ─────────────────────────

/** Crops the middle of the picture to a 3:4 portrait, like an ID photo, before uploading it. */
export async function cropPortrait(file: File): Promise<File> {
  const img = await loadImage(file);
  const W = img.naturalWidth;
  const H = img.naturalHeight;
  const ratio = 3 / 4;
  let sw = W;
  let sh = W / ratio;
  if (sh > H) {
    sh = H;
    sw = H * ratio;
  }
  // Selfies have the face in the upper half: keep a bit more of the top.
  const sx = (W - sw) / 2;
  const sy = Math.max(0, (H - sh) * 0.3);
  const out = Math.min(900, sw);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(out);
  canvas.height = Math.round(out / ratio);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('El navegador no pot processar la imatge.');
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', 0.9));
  if (!blob) throw new Error('No s’ha pogut preparar la foto.');
  return new File([blob], 'cara.jpg', { type: 'image/jpeg' });
}

// ───────────────────────── Local mode (no Supabase) ─────────────────────────

const LOCAL_KEY = 'lleida-league:registrations';
const LOCAL_FILES = 'lleida-league:private-files';
const LOCAL_SESSION = 'lleida-league:president';

type LocalRow = Registration & { password: string };

function readLocal(): Record<string, LocalRow> {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY) || '{}') as Record<string, LocalRow>;
  } catch {
    return {};
  }
}

function writeLocal(rows: Record<string, LocalRow>) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(rows));
}

function readFiles(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_FILES) || '{}') as Record<string, string>;
  } catch {
    return {};
  }
}

const strip = ({ password: _pw, ...row }: LocalRow): Registration => ({ ...row, data: normalizeData(row.data) });

// ───────────────────────── Supabase rows ─────────────────────────

interface Row {
  email: string;
  category: CategoryId;
  status: RegStatus;
  data: unknown;
  admin_note: string;
  team_id: string | null;
  created_at: string;
  updated_at: string;
}

const fromRow = (r: Row): Registration => ({
  email: r.email,
  category: r.category,
  status: r.status,
  data: normalizeData(r.data),
  adminNote: r.admin_note ?? '',
  teamId: r.team_id,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

function friendly(message: string | undefined): string {
  const m = (message ?? '').toLowerCase();
  if (m.includes('invalid login') || m.includes('invalid credentials')) return 'Correu o contrasenya incorrectes.';
  if (m.includes('fetch') || m.includes('network')) return 'No s’ha pogut connectar. Revisa la connexió.';
  if (m.includes('locked')) return 'La inscripció ja s’ha enviat: ara només la pot tornar a obrir l’organització.';
  if (m.includes('too big')) return 'La inscripció és massa gran.';
  if (m.includes('does not exist') || m.includes('pgrst202') || m.includes('pgrst205')) return 'Falta preparar les inscripcions a Supabase (executa l’SQL actualitzat).';
  return message || 'Alguna cosa no ha anat bé.';
}

// ───────────────────────── President side ─────────────────────────

export interface PresidentSession {
  email: string;
  /** Folder of their uploads. */
  userId: string;
}

export async function presidentSession(): Promise<PresidentSession | null> {
  if (!supabaseEnabled) {
    const email = sessionStorage.getItem(LOCAL_SESSION);
    return email && readLocal()[email] ? { email, userId: `local-${email.replace(/[^a-z0-9]/g, '')}` } : null;
  }
  const sb = await getSupabase();
  const { data } = await sb.auth.getSession();
  const u = data.session?.user;
  return u?.email ? { email: u.email.toLowerCase(), userId: u.id } : null;
}

export async function presidentSignIn(email: string, password: string): Promise<string | null> {
  const mail = email.trim().toLowerCase();
  if (!supabaseEnabled) {
    const row = readLocal()[mail];
    if (!row || row.password !== password) return 'Correu o contrasenya incorrectes.';
    sessionStorage.setItem(LOCAL_SESSION, mail);
    return null;
  }
  try {
    const sb = await getSupabase();
    const { error } = await sb.auth.signInWithPassword({ email: mail, password });
    if (error) return friendly(error.message);
    if (!(await loadMine())) {
      await sb.auth.signOut();
      return 'Aquest compte no té cap inscripció assignada. Parla amb l’organització.';
    }
    return null;
  } catch (e) {
    return friendly(e instanceof Error ? e.message : undefined);
  }
}

export async function presidentSignOut() {
  if (!supabaseEnabled) return sessionStorage.removeItem(LOCAL_SESSION);
  try {
    const sb = await getSupabase();
    await sb.auth.signOut();
  } catch {
    /* offline */
  }
}

export async function loadMine(): Promise<Registration | null> {
  if (!supabaseEnabled) {
    const email = sessionStorage.getItem(LOCAL_SESSION);
    const row = email ? readLocal()[email] : undefined;
    return row ? strip(row) : null;
  }
  const sb = await getSupabase();
  const { data: s } = await sb.auth.getSession();
  const email = s.session?.user.email?.toLowerCase();
  if (!email) return null;
  const { data, error } = await sb.from('registrations').select('*').eq('email', email).maybeSingle();
  if (error) throw new Error(friendly(error.message));
  return data ? fromRow(data as Row) : null;
}

/** Saves the president's draft (and sends it when `submit`). Returns the new status. */
export async function saveMine(data: RegData, submit = false): Promise<RegStatus> {
  if (!supabaseEnabled) {
    const email = sessionStorage.getItem(LOCAL_SESSION);
    const rows = readLocal();
    const row = email ? rows[email] : undefined;
    if (!row) throw new Error('Torna a iniciar la sessió.');
    if (row.status !== 'draft' && row.status !== 'changes') throw new Error(friendly('locked'));
    rows[row.email] = { ...row, data, status: submit ? 'submitted' : row.status, updatedAt: new Date().toISOString() };
    writeLocal(rows);
    return rows[row.email].status;
  }
  const sb = await getSupabase();
  const { data: status, error } = await sb.rpc('registration_save', { p_data: data, p_submit: submit });
  if (error) throw new Error(friendly(error.message));
  return status as RegStatus;
}

// ───────────────────────── Files ─────────────────────────

/** Public picture (crest, face photo, president photo) into the president's own folder. */
export const uploadPublic = (file: File, kind: 'avatar' | 'logo', s: PresidentSession) => uploadImage(file, kind, `inscripcions/${s.userId}`);

/** Private document (ID picture, signed paper): images are shrunk, PDFs go as they are. Returns its private path. */
export async function uploadPrivate(file: File, s: PresidentSession, label: string): Promise<string> {
  const pdf = file.type === 'application/pdf';
  if (!pdf && !file.type.startsWith('image/')) throw new Error('Ha de ser una foto o un PDF.');
  if (file.size > 10 * 1024 * 1024) throw new Error('El fitxer és massa gran (màxim 10 MB).');
  if (!supabaseEnabled) {
    const blob = pdf ? file : (await shrink(file, 900)).blob;
    const path = `local:${uid(label)}`;
    const files = readFiles();
    files[path] = await blobToDataUrl(blob);
    try {
      localStorage.setItem(LOCAL_FILES, JSON.stringify(files));
    } catch {
      throw new Error('En mode local no hi cap més: prova amb fotos més petites.');
    }
    return path;
  }
  const { blob, ext } = pdf ? { blob: file as Blob, ext: 'pdf' } : await shrink(file, 1800);
  const sb = await getSupabase();
  const path = `${s.userId}/${uid(label)}.${ext}`;
  const { error } = await sb.storage.from('privat').upload(path, blob, { contentType: blob.type || (pdf ? 'application/pdf' : 'image/jpeg') });
  if (error) {
    const m = error.message.toLowerCase();
    if (m.includes('bucket not found')) throw new Error('Falta crear l’espai privat a Supabase (executa l’SQL actualitzat).');
    if (m.includes('row-level security')) throw new Error('No tens permís per pujar documents. Torna a iniciar la sessió.');
    throw new Error(error.message);
  }
  return path;
}

/** Short-lived link to look at a private document (president: own files; admins: all). */
export async function privateUrl(path: string): Promise<string> {
  if (path.startsWith('local:')) return readFiles()[path] ?? '';
  const sb = await getSupabase();
  const { data, error } = await sb.storage.from('privat').createSignedUrl(path, 600);
  if (error || !data) throw new Error('No s’ha pogut obrir el document.');
  return data.signedUrl;
}

export async function deletePrivate(paths: string[]) {
  const list = paths.filter(Boolean);
  if (!list.length) return;
  const local = list.filter((p) => p.startsWith('local:'));
  if (local.length) {
    const files = readFiles();
    local.forEach((p) => delete files[p]);
    localStorage.setItem(LOCAL_FILES, JSON.stringify(files));
  }
  const remote = list.filter((p) => !p.startsWith('local:'));
  if (remote.length && supabaseEnabled) {
    const sb = await getSupabase();
    await sb.storage.from('privat').remove(remote);
  }
}

export const isPdf = (path: string) => path.endsWith('.pdf') || (path.startsWith('local:') && (readFiles()[path] ?? '').startsWith('data:application/pdf'));

// ───────────────────────── Admin side ─────────────────────────

export async function listRegistrations(): Promise<Registration[]> {
  if (!supabaseEnabled) return Object.values(readLocal()).map(strip);
  const sb = await getSupabase();
  const { data, error } = await sb.from('registrations').select('*').order('created_at', { ascending: true });
  if (error) throw new Error(friendly(error.message));
  return (data as Row[]).map(fromRow);
}

export type AccountOutcome = 'created' | 'exists' | 'manual';

async function presidentApi(body: Record<string, unknown>): Promise<{ ok: boolean; error?: string; status: number }> {
  const sb = await getSupabase();
  const { data } = await sb.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Torna a iniciar sessió com a administrador.');
  let res: Response;
  try {
    res = await fetch('/api/president', { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  } catch {
    return { ok: false, error: 'offline', status: 0 };
  }
  const out = (await res.json().catch(() => ({}))) as { error?: string };
  return { ok: res.ok, error: out.error, status: res.status };
}

/**
 * Creates the president's registration (e-mail + category) and, when the server can, their login too.
 * `manual` = the row exists but the login must be created by hand in Supabase (no service key / no server here).
 */
export async function createPresident(email: string, password: string, category: CategoryId): Promise<AccountOutcome> {
  const mail = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) throw new Error('Escriu un correu vàlid.');
  if (password.length < 8) throw new Error('La contrasenya ha de tenir 8 caràcters o més.');
  const now = new Date().toISOString();
  if (!supabaseEnabled) {
    const rows = readLocal();
    if (rows[mail]) throw new Error('Aquest correu ja té una inscripció.');
    rows[mail] = { email: mail, category, status: 'draft', data: emptyData(), adminNote: '', teamId: null, createdAt: now, updatedAt: now, password };
    writeLocal(rows);
    return 'created';
  }
  const sb = await getSupabase();
  const { error } = await sb.from('registrations').insert({ email: mail, category, data: emptyData() });
  if (error) throw new Error(error.code === '23505' ? 'Aquest correu ja té una inscripció.' : friendly(error.message));
  const r = await presidentApi({ action: 'create', email: mail, password });
  if (r.ok) return 'created';
  if (r.error === 'exists') return 'exists';
  if (r.error === 'missing-service-key' || r.status === 404 || r.error === 'offline') return 'manual';
  throw new Error(r.error ?? 'No s’ha pogut crear el compte.');
}

export async function setPresidentPassword(email: string, password: string): Promise<'ok' | 'manual'> {
  if (!supabaseEnabled) {
    const rows = readLocal();
    if (rows[email]) rows[email].password = password;
    writeLocal(rows);
    return 'ok';
  }
  const r = await presidentApi({ action: 'password', email, password });
  if (r.ok) return 'ok';
  if (r.error === 'missing-service-key' || r.status === 404 || r.error === 'offline') return 'manual';
  throw new Error(r.error === 'no-user' ? 'Aquest correu encara no té compte d’usuari.' : r.error === 'is-admin' ? 'Aquest correu és d’un administrador.' : (r.error ?? 'Error'));
}

export async function updateRegistration(email: string, patch: Partial<Pick<Registration, 'status' | 'adminNote' | 'teamId' | 'data' | 'category'>>) {
  if (!supabaseEnabled) {
    const rows = readLocal();
    if (!rows[email]) return;
    rows[email] = { ...rows[email], ...patch, updatedAt: new Date().toISOString() };
    writeLocal(rows);
    return;
  }
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.status) row.status = patch.status;
  if (patch.adminNote !== undefined) row.admin_note = patch.adminNote;
  if (patch.teamId !== undefined) row.team_id = patch.teamId;
  if (patch.data) row.data = patch.data;
  if (patch.category) row.category = patch.category;
  const sb = await getSupabase();
  const { error } = await sb.from('registrations').update(row).eq('email', email);
  if (error) throw new Error(friendly(error.message));
}

/** Deletes the registration, its private documents and (when possible) the login. */
export async function deleteRegistration(reg: Registration) {
  await deletePrivate([...reg.data.players.map((p) => p.dniPath), ...reg.data.rightsDocs]).catch(() => {});
  if (!supabaseEnabled) {
    const rows = readLocal();
    delete rows[reg.email];
    writeLocal(rows);
    return;
  }
  const sb = await getSupabase();
  const { error } = await sb.from('registrations').delete().eq('email', reg.email);
  if (error) throw new Error(friendly(error.message));
  await presidentApi({ action: 'delete', email: reg.email }).catch(() => {});
}
