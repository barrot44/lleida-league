import { AnimatePresence, motion } from 'framer-motion';
import type { ObsLayerId, ObsState } from '@/obs/types';
import { Scorebug } from '@/obs/overlay/Scorebug';
import { Flash, flashActive } from '@/obs/overlay/Flash';
import { BrandBug, LowerThird, ReplayTag, SponsorBug, TickerBar } from '@/obs/overlay/Chrome';
import { MainGraphic } from '@/obs/overlay/Graphics';
import { FullScreen } from '@/obs/overlay/Screens';
import { FitInside, boardMotion } from '@/obs/overlay/kit';

export const STAGE_W = 1920;
export const STAGE_H = 1080;

interface Props {
  state: ObsState;
  now: number;
  /** Layers to draw (`null` = all). */
  layers?: Set<ObsLayerId> | null;
  scale?: number;
}

/** The whole 1920×1080 broadcast canvas. Used by the OBS page and by the live preview of the admin panel. */
export function Stage({ state, now, layers = null, scale = 1 }: Props) {
  const on = (id: ObsLayerId) => !layers || layers.has(id);
  const sb = state.scoreboard;
  const showScore = on('marcador') && sb.visible && !!sb.home && !!sb.away;
  const flash = on('avisos') && flashActive(state.flash, now) ? state.flash : null;
  const main = state.main;
  const showMain = on('grafics') && main.visible && !!main.graphic && (!main.hideAt || now < main.hideAt);
  const lt = state.lower;
  const showLower = on('rotul') && lt.visible && !!lt.title.trim() && (!lt.hideAt || now < lt.hideAt);
  const showTicker = on('barra') && state.ticker.visible && state.ticker.items.some((s) => s.trim());
  const showBrand = on('marca') && state.brand.visible;
  const showSponsors = on('marca') && state.sponsors.visible && state.sponsors.items.length > 0;
  const showScreen = on('pantalles') && state.screen.visible;

  return (
    <div
      data-artwork="true"
      className="relative overflow-hidden"
      style={{ width: STAGE_W, height: STAGE_H, transform: scale === 1 ? undefined : `scale(${scale})`, transformOrigin: 'top left' }}
    >
      <AnimatePresence>{showScore && <Scorebug key="score" sb={sb} now={now} />}</AnimatePresence>
      <AnimatePresence>{showBrand && <BrandBug key="brand" />}</AnimatePresence>
      <AnimatePresence>{showSponsors && <SponsorBug key="sponsors" items={state.sponsors.items} seconds={state.sponsors.seconds} lowered={showBrand} />}</AnimatePresence>
      <AnimatePresence>{on('marcador') && state.replay.visible && <ReplayTag key="replay" />}</AnimatePresence>

      <AnimatePresence mode="wait">
        {showMain && main.graphic && (
          <motion.div key={main.id} {...boardMotion} className="absolute inset-x-[60px]" style={{ top: showScore ? 165 : 60, bottom: showTicker ? 96 : 50 }}>
            <FitInside className="h-full w-full">
              <MainGraphic graphic={main.graphic} accent={state.accent} />
            </FitInside>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>{showLower && <LowerThird key={lt.id} lt={lt} raised={showTicker} />}</AnimatePresence>
      <AnimatePresence>{showTicker && <TickerBar key="ticker" ticker={state.ticker} />}</AnimatePresence>
      <AnimatePresence>{flash && <Flash key={flash.id} flash={flash} />}</AnimatePresence>

      <AnimatePresence>
        {showScreen && <FullScreen key={`screen-${state.screen.kind}`} screen={state.screen} sb={sb} sponsors={state.sponsors.items} accent={state.accent} now={now} />}
      </AnimatePresence>
    </div>
  );
}
