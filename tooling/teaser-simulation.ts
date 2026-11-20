import { createMatch, stepMatch } from "../apps/web/src/simulation/match";
import { resolveLevel } from "../apps/web/src/simulation/levels";
import { FIXED_DT } from "../apps/web/src/simulation/arena";
import {
  DEFAULT_OPTIONS,
  IDLE_INTENT,
  alive,
  type GameEvent,
} from "../apps/web/src/simulation/types";
import { createRoundObserver } from "../apps/web/src/session/round-observer";
import { createTitleDemo } from "../apps/web/src/session/title-demo";
import { TEASER_TAKES, TEASER_FPS, type TeaserShot } from "./teaser-plan";

export function createTeaserSimulation(id: TeaserShot) {
  const take = TEASER_TAKES[id],
    level = resolveLevel(take.level);
  let state = createMatch(take.seed, level.playerCount, take.initialPieces ?? 3, take.seed, level);
  const initialHealth = state.players.map((player) => player.health.length);
  state.phase = "playing";
  state.countdown = 0;
  const title = id === "title" || id === "end" ? createTitleDemo(state) : null;
  const observer = createRoundObserver(level.playerCount);
  const options = {
    ...DEFAULT_OPTIONS,
    humanSeat: -1,
    botLevel: level.level,
    ballSpeed: level.ballSpeed,
    ballInterval: level.ballInterval,
    maxBalls: level.maxBalls,
    rallyAcceleration: true,
  };
  let selectedSpin = 0,
    curveHit = false,
    peakBalls = state.balls.length;
  const step = () => {
    if (title) {
      title.advance(FIXED_DT);
      state = title.state;
      return [];
    }
    state = stepMatch(state, IDLE_INTENT, options);
    const events = observer.observe(state.events, state.balls.length);
    peakBalls = Math.max(peakBalls, state.balls.length);
    return events;
  };
  for (let tick = 0; tick < Math.round(take.warmup / FIXED_DT); tick++) step();
  const initial = {
    elapsed: state.elapsed,
    survivors: state.players.filter(alive).length,
    arena: state.arena.count,
  };
  let accumulatedTicks = 0;
  let morphFrames = 0,
    eliminationsShown = 0;
  return {
    take,
    level,
    initial,
    get state() {
      return state;
    },
    owners: () => observer.owners(),
    frame() {
      const events: GameEvent[] = [];
      accumulatedTicks += take.speed / TEASER_FPS / FIXED_DT;
      while (accumulatedTicks >= 1 - 1e-8) {
        events.push(...step());
        accumulatedTicks -= 1;
      }
      if (state.morph) morphFrames++;
      eliminationsShown += events.filter((event) => event.type === "elimination").length;
      for (const event of events) {
        if (take.curveHit && event.ballId === take.curveHit.ball) {
          if (
            (event.type === "paddle" || event.type === "launch") &&
            event.seat === take.curveHit.attacker
          )
            selectedSpin = Math.max(
              selectedSpin,
              Math.abs(
                event.impact?.spin ??
                  state.balls.find((ball) => ball.id === event.ballId)?.spin ??
                  0,
              ),
            );
          if (
            event.type === "damage" &&
            event.seat === take.curveHit.target &&
            event.attackerSeat === take.curveHit.attacker
          )
            curveHit = true;
        }
      }
      return events;
    },
    summary: () => ({
      count: level.playerCount,
      level: level.level,
      seed: take.seed,
      initial,
      speed: take.speed,
      survivors: state.players.filter(alive).length,
      phase: state.phase,
      balls: state.balls.length,
      peakBalls,
      elapsed: state.elapsed,
      stats: state.stats,
      selectedSpin,
      morphFrames,
      eliminationsShown,
      initialPieces: take.initialPieces ?? 3,
      initialHealth,
      curveHit,
      peakSpin: Math.max(0, ...state.balls.map((ball) => Math.abs(ball.spin ?? 0))),
    }),
  };
}
