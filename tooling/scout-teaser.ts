import { createMatch, stepMatch } from "../apps/web/src/simulation/match";
import { resolveLevel } from "../apps/web/src/simulation/levels";
import { DEFAULT_OPTIONS, IDLE_INTENT, alive } from "../apps/web/src/simulation/types";
import { FIXED_DT } from "../apps/web/src/simulation/arena";
import { writeFileSync } from "node:fs";

const candidates: unknown[] = [];
const pressure: unknown[] = [];
console.log(JSON.stringify({ level100: resolveLevel(100) }));
for (const levelNumber of [63, 100]) {
  const level = resolveLevel(levelNumber);
  const options = {
    ...DEFAULT_OPTIONS,
    humanSeat: -1,
    botLevel: levelNumber,
    ballSpeed: level.ballSpeed,
    ballInterval: level.ballInterval,
    maxBalls: level.maxBalls,
    rallyAcceleration: true,
  };
  for (const seed of [2026, 1, 2, 4, 7, 19, 42, 77]) {
    let state = createMatch(seed, level.playerCount, 3, seed, level);
    state.phase = "playing";
    state.countdown = 0;
    const flights = new Map<
      number,
      { time: number; spin: number; seat: number; banks: number; clean: boolean; type: string }
    >();
    const tally = { paddle: 0, damage: 0, elimination: 0 };
    for (let tick = 0; tick < 42 / FIXED_DT && state.phase !== "finished"; tick++) {
      state = stepMatch(state, IDLE_INTENT, options);
      for (const event of state.events) {
        if (event.type in tally) tally[event.type as keyof typeof tally]++;
        const ballId = event.ballId;
        if (ballId === undefined) continue;
        if (event.type === "launch" || event.type === "paddle") {
          const spin =
            event.impact?.spin ?? state.balls.find((ball) => ball.id === ballId)?.spin ?? 0;
          flights.set(ballId, {
            time: state.elapsed,
            spin,
            seat: event.seat,
            banks: 0,
            clean: true,
            type: event.type,
          });
        }
        const flight = flights.get(ballId);
        if (event.type === "wall" && flight) flight.banks++;
        if (event.type === "ball" && flight) flight.clean = false;
        if (
          event.type === "damage" &&
          flight &&
          flight.clean &&
          Math.abs(flight.spin) > 1.3 &&
          state.elapsed - flight.time > 0.25 &&
          state.elapsed - flight.time < 2.4
        ) {
          candidates.push({
            level: levelNumber,
            count: level.playerCount,
            seed,
            ballId,
            ...flight,
            impactAt: state.elapsed,
            target: event.seat,
            position: event.position,
            survivors: state.players.filter(alive).length,
          });
        }
      }
      if (levelNumber === 100 && tick % 120 === 0 && state.elapsed > 20)
        pressure.push({
          seed,
          elapsed: state.elapsed,
          balls: state.balls.length,
          active: state.balls.filter((ball) => ball.phase === "active").length,
          survivors: state.players.filter(alive).length,
          ...tally,
        });
    }
  }
}
writeFileSync(
  "/private/tmp/citadel-teaser-scout.json",
  JSON.stringify({ candidates, pressure }, null, 2),
);
console.log(
  JSON.stringify(
    {
      candidates: candidates.slice(0, 24),
      pressure: pressure.filter((sample) => (sample as { balls: number }).balls >= 14).slice(0, 20),
      totalCurves: candidates.length,
    },
    null,
    2,
  ),
);
