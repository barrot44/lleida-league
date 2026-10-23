import type { ObsCommand, ObsExecStatus } from '@/obs/types';
import { ObsRequestError, ObsSocket } from '@/obs/obsSocket';
import { sendExecStatus } from '@/obs/bus';

/**
 * Runs INSIDE OBS (in the overlay browser source) when its URL carries the obs-websocket address in the hash
 * (`/obs#obs=ws://localhost:4455&pw=…`; the hash never leaves the PC). It executes the commands published by the
 * control panel — from the PC or from a phone — perfectly in sync with its own animations:
 *  - scene changes behind the Lleida League logo transition,
 *  - replays: save the replay buffer, play it in a dedicated scene and come back,
 *  - "Jugades del partit": play several saved clips in a row.
 */

export const REPLAY_SCENE = 'Lleida League · Repetició';
export const REPLAY_MEDIA = 'Lleida League · Vídeo repetició';

const COVER_IN_MS = 560;
const COVER_OUT_MS = 520;
const MAX_AGE_MS = 60_000;
const DONE_KEY = 'lleida-league:obs-done';
const FILES_KEY = 'lleida-league:obs-clip-files';

export interface ExecFx {
  cover: boolean;
  replay: { label: string; title: string; index: number; total: number } | null;
}

export function execConfigFromHash(): { url: string; password: string } | null {
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const url = params.get('obs');
  return url ? { url, password: params.get('pw') ?? '' } : null;
}

const sleep = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms));

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function save(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

const is = (e: unknown, code: number) => e instanceof ObsRequestError && e.code === code;

export class ObsExecutor {
  private socket = new ObsSocket();
  private stopped = false;
  private running = false;
  private queue: Promise<void> = Promise.resolve();
  private done = new Set<string>(load<string[]>(DONE_KEY, []));
  private files: Record<string, string> = load(FILES_KEY, {});
  private savedWaiter: ((path: string) => void) | null = null;
  private endedWaiter: (() => void) | null = null;
  private closed: (() => void) | null = null;
  private sceneReady = false;
  private lastLiveScene = '';
  private heartbeat = 0;
  private status: ObsExecStatus = { at: 0, connected: false, error: null, scenes: [], currentScene: '', replayBuffer: false, replayError: null, busy: null, clips: [] };

  constructor(
    private url: string,
    private password: string,
    private onFx: (fx: Partial<ExecFx>) => void,
  ) {
    const s = this.socket;
    s.on('CurrentProgramSceneChanged', (d) => {
      const name = String(d.sceneName);
      if (name !== REPLAY_SCENE) this.lastLiveScene = name;
      this.patch({ currentScene: name });
    });
    s.on('SceneListChanged', (d) => this.patch({ scenes: sceneNames(d.scenes) }));
    s.on('ReplayBufferStateChanged', (d) => this.patch({ replayBuffer: Boolean(d.outputActive), replayError: d.outputActive ? null : this.status.replayError }));
    s.on('ReplayBufferSaved', (d) => this.savedWaiter?.(String(d.savedReplayPath)));
    s.on('MediaInputPlaybackEnded', (d) => {
      if (d.inputName === REPLAY_MEDIA) this.endedWaiter?.();
    });
    s.onClose = () => this.closed?.();
  }

  start() {
    this.stopped = false;
    window.clearInterval(this.heartbeat);
    this.heartbeat = window.setInterval(() => this.push(), 4000);
    if (this.running) return;
    this.running = true;
    void this.loop().finally(() => (this.running = false));
  }

  stop() {
    this.stopped = true;
    window.clearInterval(this.heartbeat);
    this.socket.close();
  }

  /** Runs every command it has not run yet (recent ones only: a reload must not replay old orders). */
  handle(cmds: ObsCommand[]) {
    const now = Date.now();
    for (const cmd of cmds) {
      if (this.done.has(cmd.id)) continue;
      this.done.add(cmd.id);
      save(DONE_KEY, [...this.done].slice(-60));
      if (Math.abs(now - cmd.at) > MAX_AGE_MS) continue;
      this.queue = this.queue.then(() => this.run(cmd)).catch(() => {});
    }
  }

  // ───────────────────────── connection ─────────────────────────

  private async loop() {
    while (!this.stopped) {
      try {
        const closed = new Promise<void>((r) => (this.closed = r));
        await this.socket.connect(this.url, this.password);
        this.sceneReady = false;
        this.patch({ connected: true, error: null });
        await this.refreshScenes();
        await this.ensureReplayBuffer();
        await closed;
        this.patch({ connected: false, error: 'S’ha perdut la connexió amb OBS.' });
      } catch (e) {
        this.patch({ connected: false, error: e instanceof Error ? e.message : 'No connecta amb OBS.' });
      }
      await sleep(5000);
    }
  }

  private req<T = Record<string, unknown>>(type: string, data?: Record<string, unknown>) {
    return this.socket.request<T>(type, data);
  }

  private patch(p: Partial<ObsExecStatus>) {
    this.status = { ...this.status, ...p };
    this.push();
  }

  private push() {
    this.status = { ...this.status, at: Date.now(), clips: Object.keys(this.files) };
    sendExecStatus(this.status);
  }

  private async refreshScenes() {
    const res = await this.req<{ currentProgramSceneName: string; scenes: unknown }>('GetSceneList');
    if (res.currentProgramSceneName !== REPLAY_SCENE) this.lastLiveScene = res.currentProgramSceneName;
    this.patch({ scenes: sceneNames(res.scenes), currentScene: res.currentProgramSceneName });
  }

  private async ensureReplayBuffer() {
    try {
      const st = await this.req<{ outputActive: boolean }>('GetReplayBufferStatus');
      if (!st.outputActive) await this.req('StartReplayBuffer');
      this.patch({ replayBuffer: true, replayError: null });
    } catch {
      this.patch({
        replayBuffer: false,
        replayError: 'Activa el buffer de repeticions a OBS: Configuració → Sortida → Buffer de repeticions (Settings → Output → Replay Buffer).',
      });
    }
  }

  // ───────────────────────── commands ─────────────────────────

  private async run(cmd: ObsCommand) {
    if (!this.socket.connected) return;
    try {
      if (cmd.type === 'scene') await this.switchScene(cmd.scene, cmd.transition);
      else if (cmd.type === 'replay') {
        this.patch({ busy: 'Desant la jugada…' });
        const path = await this.saveReplay();
        this.files[cmd.clipId] = path;
        save(FILES_KEY, this.files);
        await this.play([{ id: cmd.clipId, label: cmd.label }], cmd.slow, 'Repetició');
      } else if (cmd.type === 'play') {
        await this.play(
          cmd.clipIds.map((id) => ({ id, label: '' })),
          cmd.slow,
          cmd.title,
        );
      }
    } catch (e) {
      this.onFx({ cover: false, replay: null });
      this.patch({ error: e instanceof Error ? e.message : 'Error executant l’ordre a OBS.' });
    } finally {
      this.patch({ busy: null });
    }
  }

  private async cover() {
    this.onFx({ cover: true });
    await sleep(COVER_IN_MS);
  }

  private async uncover() {
    await sleep(80);
    this.onFx({ cover: false });
    await sleep(COVER_OUT_MS);
  }

  private async switchScene(scene: string, transition: boolean) {
    if (!transition) {
      await this.req('SetCurrentProgramScene', { sceneName: scene });
      return;
    }
    await this.cover();
    try {
      await this.req('SetCurrentProgramScene', { sceneName: scene });
    } finally {
      await this.uncover();
    }
  }

  private async saveReplay(): Promise<string> {
    if (!this.status.replayBuffer) await this.ensureReplayBuffer();
    if (!this.status.replayBuffer) throw new Error(this.status.replayError ?? 'El buffer de repeticions no està actiu.');
    const saved = new Promise<string>((resolve, reject) => {
      this.savedWaiter = resolve;
      window.setTimeout(() => reject(new Error('timeout')), 6000);
    });
    await this.req('SaveReplayBuffer');
    try {
      return await saved;
    } catch {
      const last = await this.req<{ savedReplayPath: string }>('GetLastReplayBufferReplay');
      return last.savedReplayPath;
    } finally {
      this.savedWaiter = null;
    }
  }

  /** Our own browser source (to show the overlay on top of the replays too). */
  private async findOverlayInput(): Promise<string | null> {
    const { inputs } = await this.req<{ inputs: { inputName: string }[] }>('GetInputList', { inputKind: 'browser_source' });
    for (const i of inputs) {
      const { inputSettings } = await this.req<{ inputSettings: { url?: string } }>('GetInputSettings', { inputName: i.inputName });
      if (String(inputSettings.url ?? '').startsWith(`${window.location.origin}/obs`)) return i.inputName;
    }
    return null;
  }

  private async fit(sceneName: string, sceneItemId: number) {
    const video = await this.req<{ baseWidth: number; baseHeight: number }>('GetVideoSettings');
    await this.req('SetSceneItemTransform', {
      sceneName,
      sceneItemId,
      sceneItemTransform: { positionX: 0, positionY: 0, boundsType: 'OBS_BOUNDS_SCALE_INNER', boundsWidth: video.baseWidth, boundsHeight: video.baseHeight, boundsAlignment: 0 },
    });
  }

  private async itemIn(sceneName: string, sourceName: string): Promise<{ id: number; created: boolean }> {
    try {
      const r = await this.req<{ sceneItemId: number }>('GetSceneItemId', { sceneName, sourceName });
      return { id: r.sceneItemId, created: false };
    } catch {
      const r = await this.req<{ sceneItemId: number }>('CreateSceneItem', { sceneName, sourceName, sceneItemEnabled: true });
      return { id: r.sceneItemId, created: true };
    }
  }

  /** Creates (once) the replay scene: a media source for the clips with the overlay on top. */
  private async ensureReplayScene() {
    if (this.sceneReady) return;
    try {
      await this.req('CreateScene', { sceneName: REPLAY_SCENE });
    } catch (e) {
      if (!is(e, 601)) throw e;
    }
    try {
      const r = await this.req<{ sceneItemId: number }>('CreateInput', {
        sceneName: REPLAY_SCENE,
        inputName: REPLAY_MEDIA,
        inputKind: 'ffmpeg_source',
        inputSettings: { is_local_file: true, looping: false, restart_on_activate: false, close_when_inactive: false, clear_on_media_end: false },
        sceneItemEnabled: true,
      });
      await this.fit(REPLAY_SCENE, r.sceneItemId);
    } catch (e) {
      if (!is(e, 601)) throw e;
      const media = await this.itemIn(REPLAY_SCENE, REPLAY_MEDIA);
      if (media.created) await this.fit(REPLAY_SCENE, media.id);
    }
    const overlay = await this.findOverlayInput();
    if (overlay) {
      const item = await this.itemIn(REPLAY_SCENE, overlay);
      if (item.created) await this.fit(REPLAY_SCENE, item.id);
      const { sceneItems } = await this.req<{ sceneItems: unknown[] }>('GetSceneItemList', { sceneName: REPLAY_SCENE });
      await this.req('SetSceneItemIndex', { sceneName: REPLAY_SCENE, sceneItemId: item.id, sceneItemIndex: sceneItems.length - 1 });
    }
    this.sceneReady = true;
    await this.refreshScenes();
  }

  private async play(items: { id: string; label: string }[], slow: boolean, title: string) {
    const playable = items.filter((i) => this.files[i.id]);
    if (playable.length === 0) throw new Error('Aquestes jugades no són en aquest ordinador.');
    this.patch({ busy: playable.length > 1 ? `Reproduint ${playable.length} jugades…` : 'Reproduint la repetició…' });
    await this.ensureReplayScene();
    const back = this.status.currentScene && this.status.currentScene !== REPLAY_SCENE ? this.status.currentScene : this.lastLiveScene;

    for (let i = 0; i < playable.length; i++) {
      const clip = playable[i];
      await this.cover();
      await this.req('SetInputSettings', { inputName: REPLAY_MEDIA, inputSettings: { local_file: this.files[clip.id], is_local_file: true, speed_percent: slow ? 50 : 100 } });
      if (i === 0) await this.req('SetCurrentProgramScene', { sceneName: REPLAY_SCENE });
      const ended = new Promise<void>((r) => (this.endedWaiter = r));
      await this.req('TriggerMediaInputAction', { inputName: REPLAY_MEDIA, mediaAction: 'OBS_WEBSOCKET_MEDIA_INPUT_ACTION_RESTART' });
      this.onFx({ replay: { label: clip.label, title, index: i + 1, total: playable.length } });
      await this.uncover();
      // Safety net in case the "ended" event never arrives: the clip length (slower in slow motion) + margin.
      let limit = 45_000;
      try {
        const st = await this.req<{ mediaDuration: number | null }>('GetMediaInputStatus', { inputName: REPLAY_MEDIA });
        if (st.mediaDuration) limit = st.mediaDuration * (slow ? 2 : 1) + 2500;
      } catch {
        /* keep the default */
      }
      await Promise.race([ended, sleep(limit)]);
      this.endedWaiter = null;
    }

    await this.cover();
    try {
      if (back) await this.req('SetCurrentProgramScene', { sceneName: back });
    } finally {
      this.onFx({ replay: null });
      await this.uncover();
    }
  }
}

function sceneNames(scenes: unknown) {
  return ((scenes as { sceneName: string; sceneIndex: number }[]) ?? [])
    .slice()
    .sort((a, b) => b.sceneIndex - a.sceneIndex)
    .map((s) => s.sceneName);
}
