import { levelDifficulty } from "../simulation/difficulty";
import { stepMatch } from "../simulation/match";
import { DEFAULT_OPTIONS, IDLE_INTENT, type GameEvent, type MatchState } from "../simulation/types";
import { createFixedClock } from "./fixed-clock";
import { createRoundObserver } from "./round-observer";

/** An isolated all-bot match; never advances the opening round or its observer. */
export function createTitleDemo(opening: MatchState) {
  let state = structuredClone(opening);
  state.phase = "playing";
  state.countdown = 0;
  state.difficulty = Object.freeze({
    ...(opening.difficulty ?? levelDifficulty(1)),
    ballSpeed: 24,
    maxBalls: 3,
    ballInterval: 8,
    pickupCount: 0,
  });
  for (const player of state.players) player.protectedUntil = Infinity;
  const observer = createRoundObserver(state.players.length);
  const clock = createFixedClock();
  return {
    get state() {
      return state;
    },
    owners: () => observer.owners(),
    pause: () => clock.reset(),
    advance(seconds: number): GameEvent[] {
      const events: GameEvent[] = [];
      clock.advance(seconds, () => {
        state = stepMatch(state, IDLE_INTENT, { ...DEFAULT_OPTIONS, humanSeat: -1 });
        events.push(...state.events);
      });
      return observer.observe(events, state.balls.length);
    },
  };
}
