import { createMatch, stepMatch } from "../apps/web/src/simulation/match";
import { levelDifficulty } from "../apps/web/src/simulation/difficulty";
import { DEFAULT_OPTIONS } from "../apps/web/src/simulation/types";
const report = [];
for (const level of [1, 50, 100]) {
  const costs: number[] = [];
  let peak = 0;
  for (const seed of [7, 21, 2026]) {
    let state = createMatch(seed, 6, 3, seed, levelDifficulty(level));
    for (let tick = 0; tick < 120 * 90 && state.phase !== "finished"; tick++) {
      const before = performance.now();
      state = stepMatch(state, undefined, { ...DEFAULT_OPTIONS, humanSeat: -1 });
      costs.push(performance.now() - before);
      peak = Math.max(peak, state.balls.length);
    }
  }
  costs.sort((a, b) => a - b);
  report.push({
    level,
    ticks: costs.length,
    peakBalls: peak,
    medianTickMs: costs[Math.floor(costs.length * 0.5)],
    p95TickMs: costs[Math.floor(costs.length * 0.95)],
    maxTickMs: costs.at(-1),
  });
}
console.log(JSON.stringify(report, null, 2));
