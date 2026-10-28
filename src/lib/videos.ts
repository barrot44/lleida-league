import type { ObsVideoItem, ObsVideos } from '@/obs/types';
import { getSupabase, supabaseEnabled, supabaseRest } from '@/lib/supabase';
import { uid } from '@/lib/utils';

/**
 * Videos and sponsor ads for the live: stored in the public Supabase bucket «videos» and played full screen by the
 * OBS overlay. Without Supabase (local mode) the file only lives in this browser until it is closed.
 */

export const VIDEO_BUCKET = 'videos';
export const MAX_VIDEO_MB = 50;
/** Time the overlays get to load the file before it starts, so all of them start together. */
export const VIDEO_LEAD_MS = 1500;

/** Length of a video file or link, in seconds. */
export function readDuration(src: File | string): Promise<number> {
  return new Promise((resolve, reject) => {
    const v = document.createElement('video');
    const url = typeof src === 'string' ? src : URL.createObjectURL(src);
    const done = (fn: () => void) => {
      if (typeof src !== 'string') URL.revokeObjectURL(url);
      v.removeAttribute('src');
      fn();
    };
    v.preload = 'metadata';
    v.muted = true;
    v.onloadedmetadata = () => done(() => (Number.isFinite(v.duration) && v.duration > 0 ? resolve(v.duration) : reject(new Error('No s’ha pogut llegir la durada del vídeo.'))));
    v.onerror = () => done(() => reject(new Error('Aquest vídeo no es pot reproduir al navegador. Fes servir un MP4 (H.264).')));
    v.src = url;
  });
}

/** Uploads a video with progress (0–1) and returns its public URL. */
export async function uploadVideo(file: File, onProgress: (p: number) => void): Promise<string> {
  if (!file.type.startsWith('video/')) throw new Error('El fitxer ha de ser un vídeo (MP4).');
  if (file.size > MAX_VIDEO_MB * 1024 * 1024) throw new Error(`El vídeo fa més de ${MAX_VIDEO_MB} MB. Exporta’l més lleuger (1080p, H.264).`);
  if (!supabaseEnabled) return URL.createObjectURL(file);

  const sb = await getSupabase();
  const { data } = await sb.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Torna a iniciar sessió com a administrador.');
  const ext = (file.name.split('.').pop() || 'mp4').toLowerCase().replace(/[^a-z0-9]/g, '') || 'mp4';
  const path = `${uid('vid')}.${ext}`;

  // XHR instead of the SDK: big files deserve a progress bar.
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${supabaseRest.url}/storage/v1/object/${VIDEO_BUCKET}/${path}`);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.setRequestHeader('apikey', supabaseRest.key ?? '');
    xhr.setRequestHeader('Content-Type', file.type || 'video/mp4');
    xhr.setRequestHeader('cache-control', 'max-age=31536000');
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) return resolve();
      const m = xhr.responseText.toLowerCase();
      if (m.includes('bucket not found')) return reject(new Error('Falta crear el bucket «videos» a Supabase (executa l’SQL actualitzat).'));
      if (m.includes('maximum allowed size') || xhr.status === 413) return reject(new Error(`El vídeo és massa gran (màxim ${MAX_VIDEO_MB} MB).`));
      if (m.includes('row-level security') || xhr.status === 401 || xhr.status === 403) return reject(new Error('No tens permís per pujar vídeos. Torna a iniciar sessió com a administrador.'));
      reject(new Error(`No s’ha pogut pujar (${xhr.status}).`));
    };
    xhr.onerror = () => reject(new Error('Sense connexió: no s’ha pogut pujar el vídeo.'));
    xhr.send(file);
  });
  return sb.storage.from(VIDEO_BUCKET).getPublicUrl(path).data.publicUrl;
}

/** Deletes the file when it is one of ours (links from elsewhere are only forgotten). */
export async function deleteVideoFile(url: string) {
  if (url.startsWith('blob:')) return URL.revokeObjectURL(url);
  if (!supabaseEnabled) return;
  const marker = `/storage/v1/object/public/${VIDEO_BUCKET}/`;
  const i = url.indexOf(marker);
  if (i < 0) return;
  const sb = await getSupabase();
  await sb.storage.from(VIDEO_BUCKET).remove([decodeURIComponent(url.slice(i + marker.length))]);
}

export const newVideoItem = (title: string, url: string, kind: ObsVideoItem['kind'], seconds: number): ObsVideoItem => ({ id: uid('v'), title, url, kind, seconds });

/** Black screen between two videos of a list (ad breaks), in seconds. */
export const VIDEO_GAP_S = 0.8;

export const totalSeconds = (items: ObsVideoItem[]) => items.reduce((s, v) => s + Math.max(0, v.seconds), 0) + Math.max(0, items.length - 1) * VIDEO_GAP_S;

/**
 * Where a playback is at `now`: which item and how far into it (null before the start and once it is over).
 * `gap` = the black pause before item `index` (its video waits at the start).
 */
export function videoPosition(playing: ObsVideos['playing'], now: number): { index: number; offset: number; left: number; gap: boolean } | null {
  if (!playing || !playing.items.length) return null;
  let t = (now - playing.at) / 1000;
  const total = totalSeconds(playing.items);
  if (t > total + 0.5) return null;
  const left = Math.max(0, total - t);
  t = Math.max(0, t);
  const last = playing.items.length - 1;
  for (let i = 0; i <= last; i++) {
    const len = Math.max(0, playing.items[i].seconds);
    if (t < len || i === last) return { index: i, offset: Math.min(t, len), left, gap: false };
    t -= len;
    if (t < VIDEO_GAP_S) return { index: i + 1, offset: 0, left, gap: true };
    t -= VIDEO_GAP_S;
  }
  return null;
}

export const fmtSeconds = (s: number) => {
  const t = Math.max(0, Math.round(s));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
};
