import { ObsRequestError } from '@/obs/obsSocket';

/**
 * Background music for the live (before the match, half-time…): OBS captures the sound of ONE application of the
 * computer — Spotify, Chrome with YouTube, VLC… — with an "Application Audio Capture" source (Windows 10/11).
 * The source is added to every scene, starts muted and is faded in / out from the panel.
 */

export const MUSIC_INPUT = 'Lleida League · Música';

export const MUSIC_APPS = [
  { exe: 'Spotify.exe', label: 'Spotify' },
  { exe: 'chrome.exe', label: 'Chrome' },
  { exe: 'msedge.exe', label: 'Edge' },
  { exe: 'firefox.exe', label: 'Firefox' },
  { exe: 'vlc.exe', label: 'VLC' },
];

type Req = <T = Record<string, unknown>>(type: string, data?: Record<string, unknown>) => Promise<T>;

const sleep = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms));
const exists = (e: unknown) => e instanceof ObsRequestError && e.code === 601;

/** Adds the capture to every scene (once) and points it to the chosen app. */
export async function setupMusic(req: Req, exe: string): Promise<string> {
  const { scenes, currentProgramSceneName } = await req<{ scenes: { sceneName: string }[]; currentProgramSceneName: string }>('GetSceneList');
  try {
    await req('CreateInput', { sceneName: currentProgramSceneName, inputName: MUSIC_INPUT, inputKind: 'wasapi_process_output_capture', inputSettings: {}, sceneItemEnabled: true });
  } catch (e) {
    if (!exists(e)) {
      if (e instanceof ObsRequestError && /kind/i.test(e.message)) throw new Error('Aquest OBS no té «Captura d’àudio d’aplicació» (cal Windows 10/11 i OBS 28 o més nou).');
      throw e;
    }
  }
  await req('SetInputMute', { inputName: MUSIC_INPUT, inputMuted: true });

  // The list of apps that are making sound right now: the chosen one must be open.
  const { propertyItems } = await req<{ propertyItems: { itemName: string; itemValue: string }[] }>('GetInputPropertiesListPropertyItems', { inputName: MUSIC_INPUT, propertyName: 'window' });
  const want = exe.trim().toLowerCase();
  const item = propertyItems.find((i) => String(i.itemValue).toLowerCase().endsWith(`:${want}`)) ?? propertyItems.find((i) => String(i.itemValue).toLowerCase().includes(want));
  if (!item) throw new Error(`No trobo ${exe} obert a l’ordinador d’OBS. Obre l’aplicació (i posa-hi música) i torna-ho a provar.`);
  // priority 2 = match by executable, so it keeps working when the song (window title) changes.
  await req('SetInputSettings', { inputName: MUSIC_INPUT, inputSettings: { window: item.itemValue, priority: 2 } });

  for (const s of scenes) {
    try {
      await req('GetSceneItemId', { sceneName: s.sceneName, sourceName: MUSIC_INPUT });
    } catch {
      await req('CreateSceneItem', { sceneName: s.sceneName, sourceName: MUSIC_INPUT, sceneItemEnabled: true }).catch(() => {});
    }
  }
  return item.itemName;
}

/** Fades the music in (to `volume`, 0–1) or out (and then mutes it). */
export async function fadeMusic(req: Req, on: boolean, volume: number, ms = 1600) {
  const target = Math.max(0, Math.min(1, volume));
  let from = 0;
  try {
    const v = await req<{ inputVolumeMul: number }>('GetInputVolume', { inputName: MUSIC_INPUT });
    const { inputMuted } = await req<{ inputMuted: boolean }>('GetInputMute', { inputName: MUSIC_INPUT });
    from = inputMuted ? 0 : v.inputVolumeMul;
  } catch (e) {
    throw new Error(e instanceof ObsRequestError && e.code === 600 ? 'Primer prem «Prepara la música a OBS».' : 'No puc controlar la música a OBS.');
  }
  const to = on ? target : 0;
  if (on) {
    await req('SetInputVolume', { inputName: MUSIC_INPUT, inputVolumeMul: from });
    await req('SetInputMute', { inputName: MUSIC_INPUT, inputMuted: false });
  }
  const steps = 16;
  for (let i = 1; i <= steps; i++) {
    // Volume is perceived logarithmically: an eased curve sounds like a smooth fade.
    const t = i / steps;
    const k = on ? t * t : 1 - (1 - t) * (1 - t);
    await req('SetInputVolume', { inputName: MUSIC_INPUT, inputVolumeMul: from + (to - from) * k });
    await sleep(ms / steps);
  }
  if (!on) await req('SetInputMute', { inputName: MUSIC_INPUT, inputMuted: true });
}
