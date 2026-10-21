export type VideoProvider = 'youtube' | 'tiktok' | 'instagram' | 'other';

export interface ParsedVideo {
  provider: VideoProvider;
  /** Iframe source (autoplay), or `null` when the link can only be opened externally. */
  embedUrl: string | null;
  /** Thumbnail for providers that expose one without an API key. */
  thumbnail: string | null;
  /** Vertical (9:16) videos get a taller player. */
  vertical: boolean;
}

const YT = /(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/|v\/))([\w-]{11})/;
const TIKTOK = /tiktok\.com\/@[\w.-]+\/video\/(\d+)/;
const INSTA = /instagram\.com\/(p|reel|reels|tv)\/([\w-]+)/;

export function parseVideo(url: string): ParsedVideo {
  const u = url.trim();
  const yt = YT.exec(u);
  if (yt) {
    return {
      provider: 'youtube',
      embedUrl: `https://www.youtube-nocookie.com/embed/${yt[1]}?autoplay=1&rel=0`,
      thumbnail: `https://i.ytimg.com/vi/${yt[1]}/hqdefault.jpg`,
      vertical: u.includes('/shorts/'),
    };
  }
  const tk = TIKTOK.exec(u);
  if (tk) return { provider: 'tiktok', embedUrl: `https://www.tiktok.com/embed/v2/${tk[1]}`, thumbnail: null, vertical: true };
  const ig = INSTA.exec(u);
  if (ig) return { provider: 'instagram', embedUrl: `https://www.instagram.com/${ig[1] === 'reels' ? 'reel' : ig[1]}/${ig[2]}/embed`, thumbnail: null, vertical: true };
  return { provider: 'other', embedUrl: null, thumbnail: null, vertical: false };
}

export const PROVIDER_LABEL: Record<VideoProvider, string> = {
  youtube: 'YouTube',
  tiktok: 'TikTok',
  instagram: 'Instagram',
  other: 'Enllaç',
};
