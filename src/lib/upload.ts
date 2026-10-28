import { getSupabase, supabaseEnabled } from '@/lib/supabase';
import { uid } from '@/lib/utils';

export const PHOTO_BUCKET = 'fotos';

export type UploadKind = 'photo' | 'avatar' | 'logo';

/** Longest side (px) each kind of image is shrunk to before it is stored. */
const MAX_SIDE: Record<UploadKind, number> = { photo: 1600, avatar: 600, logo: 600 };
/** Without Supabase the image travels inside the saved data, so keep it tiny. */
const INLINE_SIDE = 420;

export function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('No s’ha pogut llegir la imatge. Prova amb un JPG, PNG o WebP.'));
    };
    img.src = url;
  });
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

/** Scales the image down (phone photos are huge) and re-encodes it as WebP, keeping PNG transparency. */
export async function shrink(file: File, maxSide: number): Promise<{ blob: Blob; ext: string }> {
  const img = await loadImage(file);
  const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('El navegador no pot processar la imatge.');
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const webp = await toBlob(canvas, 'image/webp', 0.85);
  if (webp && webp.type === 'image/webp') return { blob: webp, ext: 'webp' };
  const jpeg = await toBlob(canvas, 'image/jpeg', 0.85);
  if (!jpeg) throw new Error('No s’ha pogut preparar la imatge.');
  return { blob: jpeg, ext: 'jpg' };
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('No s’ha pogut llegir la imatge.'));
    reader.readAsDataURL(blob);
  });
}

/** Uploads a picture chosen on this device and returns the URL to store in the league data. */
export async function uploadImage(file: File, kind: UploadKind, folder: string): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('El fitxer ha de ser una imatge.');

  if (!supabaseEnabled) {
    const { blob } = await shrink(file, INLINE_SIDE);
    return blobToDataUrl(blob);
  }

  const { blob, ext } = await shrink(file, MAX_SIDE[kind]);
  const sb = await getSupabase();
  const path = `${folder}/${uid('img')}.${ext}`;
  const { error } = await sb.storage.from(PHOTO_BUCKET).upload(path, blob, {
    contentType: blob.type,
    cacheControl: '31536000',
  });
  if (error) {
    const m = error.message.toLowerCase();
    if (m.includes('bucket not found')) throw new Error('Falta crear el bucket «fotos» a Supabase (executa l’SQL actualitzat).');
    if (m.includes('row-level security') || m.includes('unauthorized') || m.includes('not authorized')) {
      throw new Error('No tens permís per pujar fotos. Torna a iniciar sessió com a administrador.');
    }
    throw new Error(error.message);
  }
  return sb.storage.from(PHOTO_BUCKET).getPublicUrl(path).data.publicUrl;
}
