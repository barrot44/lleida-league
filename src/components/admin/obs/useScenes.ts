import { useEffect, useState } from 'react';
import type { ObsExecStatus } from '@/obs/types';
import { onExecStatus } from '@/obs/bus';
import { REPLAY_SCENE } from '@/obs/executor';
import { useObsLink } from '@/obs/useObsLink';
import { useNow } from '@/hooks/useNow';
import type { useObsActions } from '@/components/admin/obs/useObsActions';

type Actions = ReturnType<typeof useObsActions>;

/** Latest report of the overlay that controls OBS (null when none has spoken recently). */
export function useExecStatus() {
  const [status, setStatus] = useState<ObsExecStatus | null>(null);
  const now = useNow(3000);
  useEffect(() => onExecStatus(setStatus), []);
  return status && now - status.at < 12_000 ? status : null;
}

/** OBS scenes as seen by the overlay inside OBS (any device) or by this panel's own connection. */
export function useScenes(actions: Actions) {
  const exec = useExecStatus();
  const link = useObsLink();
  const execOn = !!exec?.connected;
  const scenes = (execOn ? exec.scenes : link.status === 'on' ? link.scenes : []).filter((s) => s !== REPLAY_SCENE);
  const current = execOn ? exec.currentScene : link.currentScene;

  const goScene = (scene: string, withTransition: boolean) => {
    if (execOn) return actions.sendCmd({ type: 'scene', scene, transition: withTransition });
    // Only the panel is connected: sting on the overlay and switch while it covers the screen (allowing for the delay).
    if (withTransition) {
      actions.sting();
      window.setTimeout(() => void link.setScene(scene), 750);
    } else void link.setScene(scene);
  };

  return { exec, execOn, link, scenes, current, goScene, canSwitch: execOn || link.status === 'on' };
}
