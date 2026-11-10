import { createMatch, stepMatch } from "../apps/web/src/simulation/match";
import { DEFAULT_OPTIONS, IDLE_INTENT } from "../apps/web/src/simulation/types";
for (const seed of [1, 21, 2026, 100, 300]) {
  let state = createMatch(seed);
  for (let tick = 0; tick < 120 * 1200 && state.phase !== "finished"; tick++)
    state = stepMatch(state, IDLE_INTENT, { ...DEFAULT_OPTIONS, humanSeat: -1 });
  console.log(
    seed,
    state.phase,
    state.elapsed,
    state.stats,
    state.players.map((p) => p.health.filter(Boolean).length),
  );
}
