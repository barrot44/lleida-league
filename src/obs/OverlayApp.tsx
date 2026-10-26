import { useEffect, useMemo, useState } from 'react';
import type { ObsLayerId, ObsState } from '@/obs/types';
import { OBS_LAYERS } from '@/obs/types';
import { defaultObsState } from '@/obs/state';
import { subscribeObs } from '@/obs/transport';
import { ObsExecutor, execConfigFromHash, type ExecFx } from '@/obs/executor';
import { useNow } from '@/hooks/useNow';
import { useArenaSounds } from '@/obs/useArenaSounds';
import { STAGE_H, STAGE_W, Stage } from '@/obs/overlay/Stage';

/** `?capes=marcador,rotul` → only those layers (lets advanced users split graphics into several OBS sources). */
function layersFromUrl(): Set<ObsLayerId> | null {
  const raw = new URLSearchParams(window.location.search).get('capes');
  if (!raw) return null;
  const valid = new Set<string>(OBS_LAYERS.map((l) => l.id));
  const picked = raw.split(',').map((s) => s.trim()).filter((s) => valid.has(s)) as ObsLayerId[];
  return picked.length ? new Set(picked) : null;
}

function useViewportScale() {
  const read = () => Math.min(window.innerWidth / STAGE_W, window.innerHeight / STAGE_H) || 1;
  const [scale, setScale] = useState(read);
  useEffect(() => {
    const onResize = () => setScale(read());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return scale;
}

/** Transparent page loaded by OBS as a "Browser" source (1920×1080). */
export default function OverlayApp() {
  const [state, setState] = useState<ObsState>(defaultObsState);
  const [fx, setFx] = useState<ExecFx>({ cover: false, replay: null });
  const layers = useMemo(layersFromUrl, []);
  const scale = useViewportScale();
  const now = useNow(250);

  // With the OBS address in the hash, this page also drives OBS (transitions, replays…).
  const executor = useMemo(() => {
    const cfg = execConfigFromHash();
    return cfg ? new ObsExecutor(cfg.url, cfg.password, (p) => setFx((f) => ({ ...f, ...p }))) : null;
  }, []);

  useEffect(() => {
    if (!executor) return;
    executor.start();
    return () => executor.stop();
  }, [executor]);

  useEffect(() => subscribeObs({ onState: setState }), []);
  useArenaSounds(state);

  useEffect(() => {
    executor?.handle(state.cmds);
  }, [executor, state.cmds]);

  return <Stage state={state} now={now} layers={layers} scale={scale} fx={fx} />;
}
