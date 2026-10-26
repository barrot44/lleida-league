import { AnimatePresence, motion } from 'framer-motion';
import type { ObsLayerId, ObsState } from '@/obs/types';
import type { ExecFx } from '@/obs/executor';
import { Scorebug } from '@/obs/overlay/Scorebug';
import { GoalFlash, SideFlash, flashActive } from '@/obs/overlay/Flash';
import { BrandBug, LowerThird, QrCorner, ReplayTag, SponsorBug, TickerBar } from '@/obs/overlay/Chrome';
import { MainGraphic } from '@/obs/overlay/Graphics';
import { FullScreen } from '@/obs/overlay/Screens';
import { Stinger, useSting } from '@/obs/overlay/Stinger';
import { DICE_DURATION, DiceRoll } from '@/obs/overlay/DiceRoll';
import { ActiveCardBug, CARD_REVEAL_MS, CardRequestAlert, CardReveal } from '@/obs/overlay/CardsLayer';
import { cardIsLive } from '@/obs/cards';
import { FitInside, boardMotion } from '@/obs/overlay/kit';
import { InterviewLayer } from '@/obs/overlay/Interview';
import { UnderBug } from '@/obs/overlay/UnderBug';

export const STAGE_W = 1920;
export const STAGE_H = 1080;

interface Props {
  state: ObsState;
  now: number;
  /** Layers to draw (`null` = all). */
  layers?: Set<ObsLayerId> | null;
  scale?: number;
  /** Effects driven by the OBS executor of this page (logo transition, replay labels). */
  fx?: ExecFx;
}

/** The whole 1920×1080 broadcast canvas. Used by the OBS page and by the live preview of the admin panel. */
export function Stage({ state, now, layers = null, scale = 1, fx }: Props) {
  const on = (id: ObsLayerId) => !layers || layers.has(id);
  const sting = useSting(state.transition);
  const sb = state.scoreboard;
  const showScore = on('marcador') && sb.visible && !!sb.home && !!sb.away;
  const flash = on('avisos') && flashActive(state.flash, now) ? state.flash : null;
  const main = state.main;
  const showMain = on('grafics') && main.visible && !!main.graphic && (!main.hideAt || now < main.hideAt);
  const lt = state.lower;
  const iv = state.interview;
  const showInterview = on('rotul') && iv.visible && !!iv.name.trim() && !fx?.replay;
  const showLower = !showInterview && on('rotul') && lt.visible && !!lt.title.trim() && (!lt.hideAt || now < lt.hideAt) && !fx?.replay;
  const showTicker = on('barra') && state.ticker.visible && state.ticker.items.some((s) => s.trim());
  const showBrand = on('marca') && state.brand.visible;
  const showSponsors = on('marca') && state.sponsors.visible && state.sponsors.items.length > 0;
  const showQr = on('marca') && state.qr.visible && !!state.qr.url && !(main.visible && main.graphic?.kind === 'poll');
  const showScreen = on('pantalles') && state.screen.visible;
  const showReplay = on('marcador') && (state.replay.visible || !!fx?.replay);
  const covered = on('pantalles') && (sting || !!fx?.cover);
  const dice = state.dice.last;
  const showDice = on('avisos') && !!dice && now - dice.at >= -2000 && now - dice.at < DICE_DURATION;
  const cards = state.cards;
  const deckById = (id: string) => cards.deck.find((c) => c.id === id);
  const drawDef = cards.draw ? deckById(cards.draw.cardId) : undefined;
  const activeDef = cards.active ? deckById(cards.active.cardId) : undefined;
  const showReveal = on('avisos') && !!cards.draw && now - cards.draw.at >= -2000 && now - cards.draw.at < CARD_REVEAL_MS;
  const showRequest = on('avisos') && !!cards.request && (!cards.draw || cards.draw.at < cards.request.at) && now - cards.request.at < 90_000;
  const showActiveCard = on('marcador') && cardIsLive(cards.active, sb.clock, now) && !showReveal;
  const strip = state.strip;
  const showStrip = on('grafics') && strip.visible && !!strip.item && (!strip.hideAt || now < strip.hideAt) && !showScreen && !showMain;

  return (
    <div
      data-artwork="true"
      className="relative overflow-hidden"
      style={{ width: STAGE_W, height: STAGE_H, transform: scale === 1 ? undefined : `scale(${scale})`, transformOrigin: 'top left' }}
    >
      <AnimatePresence>{showScore && <Scorebug key="score" sb={sb} now={now} />}</AnimatePresence>
      <AnimatePresence>{showBrand && <BrandBug key="brand" />}</AnimatePresence>
      <AnimatePresence>{showSponsors && <SponsorBug key="sponsors" items={state.sponsors.items} seconds={state.sponsors.seconds} lowered={showBrand} />}</AnimatePresence>
      <AnimatePresence>{showReplay && <ReplayTag key="replay" info={fx?.replay} />}</AnimatePresence>

      <AnimatePresence mode="wait">
        {showMain && main.graphic && (
          <motion.div key={main.id} {...boardMotion} className="absolute inset-x-[60px]" style={{ top: showScore ? 150 : 60, bottom: showTicker ? 96 : 50 }}>
            <FitInside className="h-full w-full">
              <MainGraphic graphic={main.graphic} accent={state.accent} />
            </FitInside>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>{showLower && <LowerThird key={lt.id} lt={lt} raised={showTicker} />}</AnimatePresence>
      <AnimatePresence>{showInterview && <InterviewLayer key={iv.id} iv={iv} sponsors={state.sponsors.items} raised={showTicker} />}</AnimatePresence>
      <AnimatePresence>{showQr && <QrCorner key={`qr-${state.qr.url}`} url={state.qr.url} label={state.qr.label} raised={showTicker} />}</AnimatePresence>
      <AnimatePresence>{showTicker && <TickerBar key="ticker" ticker={state.ticker} />}</AnimatePresence>
      {/* Under the scoreboard, stacked: prediction / featured player, card in force, card or time-out notice. */}
      <div className="absolute left-[56px] flex flex-col items-start gap-3" style={{ top: showScore ? 142 : 44 }}>
        <AnimatePresence mode="popLayout">{showStrip && strip.item && <UnderBug key={strip.id} item={strip.item} />}</AnimatePresence>
        <AnimatePresence mode="popLayout">{showActiveCard && activeDef && cards.active && <ActiveCardBug key={cards.active.id} active={cards.active} card={activeDef} clock={sb.clock} now={now} />}</AnimatePresence>
        <AnimatePresence mode="popLayout">{flash && flash.kind !== 'goal' && <SideFlash key={flash.id} f={flash} />}</AnimatePresence>
      </div>
      <AnimatePresence>{showRequest && cards.request && <CardRequestAlert key={cards.request.id} team={cards.request.team} />}</AnimatePresence>
      <AnimatePresence>{flash?.kind === 'goal' && <GoalFlash key={flash.id} f={flash} />}</AnimatePresence>
      <AnimatePresence>{showReveal && drawDef && cards.draw && <CardReveal key={cards.draw.id} card={drawDef} team={cards.draw.team} />}</AnimatePresence>
      <AnimatePresence>{showDice && dice && <DiceRoll key={dice.id} face={dice.face} result={dice.result} />}</AnimatePresence>

      <AnimatePresence>
        {showScreen && <FullScreen key={`screen-${state.screen.kind}`} screen={state.screen} sb={sb} sponsors={state.sponsors.items} accent={state.accent} now={now} />}
      </AnimatePresence>
      <AnimatePresence>{covered && <Stinger key="sting" accent={state.accent} />}</AnimatePresence>
    </div>
  );
}
