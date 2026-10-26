import { create } from 'zustand';
import { ObsRequestError, ObsSocket } from '@/obs/obsSocket';

/** Connection from the admin panel to OBS itself (scenes, stream, recording, adding the overlay source). */

const SETTINGS_KEY = 'lleida-league:obs-link';
export const OVERLAY_INPUT_NAME = 'Lleida League · Capa';

interface LinkSettings {
  url: string;
  password: string;
  remember: boolean;
}

function loadSettings(): LinkSettings {
  try {
    const raw = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? 'null') as Partial<LinkSettings> | null;
    return { url: raw?.url || 'ws://localhost:4455', password: raw?.password ?? '', remember: raw?.remember ?? true };
  } catch {
    return { url: 'ws://localhost:4455', password: '', remember: true };
  }
}

function saveSettings(s: LinkSettings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s.remember ? s : { url: s.url, password: '', remember: false }));
  } catch {
    /* storage blocked */
  }
}

export type LinkStatus = 'off' | 'connecting' | 'on' | 'error';

interface ObsLinkStore {
  settings: LinkSettings;
  status: LinkStatus;
  error: string | null;
  version: string;
  scenes: string[];
  currentScene: string;
  streaming: boolean;
  recording: boolean;
  streamTime: string;
  busy: boolean;
  connect: (settings: LinkSettings) => Promise<void>;
  disconnect: () => void;
  setScene: (name: string) => Promise<void>;
  toggleStream: () => Promise<void>;
  toggleRecord: () => Promise<void>;
  /** Creates (or reuses) the browser source with the overlay in the current scene. Returns a message for the user. */
  installOverlay: (overlayUrl: string) => Promise<string>;
  refreshOverlay: () => Promise<string>;
  /** Raw obs-websocket request (only while connected). */
  request: <T = Record<string, unknown>>(type: string, data?: Record<string, unknown>) => Promise<T>;
}

const socket = new ObsSocket();
let statusTimer = 0;

const sceneNames = (scenes: unknown) =>
  ((scenes as { sceneName: string; sceneIndex: number }[]) ?? [])
    .slice()
    // OBS lists the bottom scene first; show them in the same order as the OBS "Scenes" dock.
    .sort((a, b) => b.sceneIndex - a.sceneIndex)
    .map((s) => s.sceneName);

const browserSettings = (url: string) => ({
  url,
  width: 1920,
  height: 1080,
  reroute_audio: false,
  restart_when_active: false,
  shutdown: false,
  css: 'body { background-color: rgba(0, 0, 0, 0); margin: 0px auto; overflow: hidden; }',
});

export const useObsLink = create<ObsLinkStore>()((set, get) => {
  const refreshScenes = async () => {
    const res = await socket.request<{ currentProgramSceneName: string; scenes: unknown }>('GetSceneList');
    set({ scenes: sceneNames(res.scenes), currentScene: res.currentProgramSceneName });
  };

  const refreshOutputs = async () => {
    const [stream, record] = await Promise.all([
      socket.request<{ outputActive: boolean; outputTimecode: string }>('GetStreamStatus'),
      socket.request<{ outputActive: boolean }>('GetRecordStatus'),
    ]);
    set({ streaming: stream.outputActive, recording: record.outputActive, streamTime: stream.outputActive ? stream.outputTimecode.split('.')[0] : '' });
  };

  socket.on('CurrentProgramSceneChanged', (d) => set({ currentScene: String(d.sceneName) }));
  socket.on('SceneListChanged', (d) => set({ scenes: sceneNames(d.scenes) }));
  for (const ev of ['SceneCreated', 'SceneRemoved', 'SceneNameChanged']) socket.on(ev, () => void refreshScenes().catch(() => {}));
  socket.on('StreamStateChanged', (d) => set({ streaming: Boolean(d.outputActive) }));
  socket.on('RecordStateChanged', (d) => set({ recording: Boolean(d.outputActive) }));
  socket.on('ExitStarted', () => get().disconnect());
  socket.onClose = (reason) => {
    window.clearInterval(statusTimer);
    set({ status: 'error', error: reason, streaming: false, recording: false, streamTime: '' });
  };

  /** Runs an OBS action and turns failures into the store error. */
  const act = async (fn: () => Promise<unknown>) => {
    set({ busy: true });
    try {
      await fn();
      set({ error: null });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Error d’OBS.' });
    } finally {
      set({ busy: false });
    }
  };

  return {
    request: (type, data) => socket.request(type, data),
    settings: loadSettings(),
    status: 'off',
    error: null,
    version: '',
    scenes: [],
    currentScene: '',
    streaming: false,
    recording: false,
    streamTime: '',
    busy: false,

    connect: async (settings) => {
      saveSettings(settings);
      set({ settings, status: 'connecting', error: null });
      try {
        const { obsVersion } = await socket.connect(settings.url.trim(), settings.password);
        set({ status: 'on', version: obsVersion });
        await Promise.all([refreshScenes(), refreshOutputs()]);
        window.clearInterval(statusTimer);
        statusTimer = window.setInterval(() => void refreshOutputs().catch(() => {}), 2000);
      } catch (e) {
        set({ status: 'error', error: e instanceof Error ? e.message : 'No s’ha pogut connectar.' });
      }
    },

    disconnect: () => {
      window.clearInterval(statusTimer);
      socket.close();
      set({ status: 'off', error: null, scenes: [], currentScene: '', streaming: false, recording: false, streamTime: '' });
    },

    setScene: (name) => act(() => socket.request('SetCurrentProgramScene', { sceneName: name }).then(() => set({ currentScene: name }))),
    toggleStream: () => act(() => socket.request('ToggleStream').then(refreshOutputs)),
    toggleRecord: () => act(() => socket.request('ToggleRecord').then(refreshOutputs)),

    installOverlay: async (overlayUrl) => {
      set({ busy: true });
      try {
        // `sceneName` since obs-websocket 5.5; `currentProgramSceneName` before (still sent, deprecated).
        const current = await socket.request<{ sceneName?: string; currentProgramSceneName?: string }>('GetCurrentProgramScene');
        const sceneName = current.sceneName ?? current.currentProgramSceneName ?? '';
        const video = await socket.request<{ baseWidth: number; baseHeight: number }>('GetVideoSettings');
        let sceneItemId: number | null = null;
        let message: string;
        try {
          const res = await socket.request<{ sceneItemId: number }>('CreateInput', {
            sceneName,
            inputName: OVERLAY_INPUT_NAME,
            inputKind: 'browser_source',
            inputSettings: browserSettings(overlayUrl),
            sceneItemEnabled: true,
          });
          sceneItemId = res.sceneItemId;
          message = `Capa afegida a l’escena «${sceneName}».`;
        } catch (e) {
          // 601 = the source already exists: update its URL and make sure it is in this scene.
          if (!(e instanceof ObsRequestError) || e.code !== 601) throw e;
          await socket.request('SetInputSettings', { inputName: OVERLAY_INPUT_NAME, inputSettings: browserSettings(overlayUrl), overlay: true });
          try {
            await socket.request('GetSceneItemId', { sceneName, sourceName: OVERLAY_INPUT_NAME });
            message = `La capa ja era a «${sceneName}». L’he actualitzada.`;
          } catch {
            const res = await socket.request<{ sceneItemId: number }>('CreateSceneItem', { sceneName, sourceName: OVERLAY_INPUT_NAME, sceneItemEnabled: true });
            sceneItemId = res.sceneItemId;
            message = `Capa existent afegida també a l’escena «${sceneName}».`;
          }
        }
        // Fit it to the canvas whatever its resolution (720p, 1080p…).
        if (sceneItemId !== null) {
          await socket.request('SetSceneItemTransform', {
            sceneName,
            sceneItemId,
            sceneItemTransform: { positionX: 0, positionY: 0, boundsType: 'OBS_BOUNDS_SCALE_INNER', boundsWidth: video.baseWidth, boundsHeight: video.baseHeight, boundsAlignment: 0 },
          });
        }
        set({ error: null });
        return message;
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'No s’ha pogut afegir la capa.';
        set({ error: msg });
        throw new Error(msg);
      } finally {
        set({ busy: false });
      }
    },

    refreshOverlay: async () => {
      try {
        await socket.request('PressInputPropertiesButton', { inputName: OVERLAY_INPUT_NAME, propertyName: 'refreshnocache' });
        return 'Capa recarregada a OBS.';
      } catch (e) {
        if (e instanceof ObsRequestError && e.code === 600) throw new Error('No trobo la capa a OBS. Afegeix-la primer.');
        throw e;
      }
    },
  };
});
