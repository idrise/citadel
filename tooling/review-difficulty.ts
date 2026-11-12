import { writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { levelDifficulty } from "../apps/web/src/simulation/difficulty";
import { createMatch, stepMatch } from "../apps/web/src/simulation/match";
import { DEFAULT_OPTIONS } from "../apps/web/src/simulation/types";
const games = [];
for (const count of [2, 4, 6] as const)
  for (const level of [1, 5, 50, 100]) {
    const difficulty = levelDifficulty(level);
    let state = createMatch(2026, count, 3, 2026, difficulty),
      peakBalls = 1,
      collections = 0;
    const start = performance.now();
    for (let tick = 0; tick < 120 * 90 && state.phase !== "finished"; tick++) {
      state = stepMatch(state, undefined, { ...DEFAULT_OPTIONS, humanSeat: -1 });
      peakBalls = Math.max(peakBalls, state.balls.length);
      collections += state.events.filter((e) => e.type === "collection").length;
    }
    assert.equal(state.stats.collisionCaps, 0);
    assert.ok(state.nextSupplyId <= difficulty.pickupCount);
    assert.ok(peakBalls <= difficulty.maxBalls);
    games.push({
      count,
      difficulty,
      seconds: state.elapsed,
      finished: state.phase === "finished",
      winner: state.winner,
      peakBalls,
      drops: state.nextSupplyId,
      collections,
      collisionCaps: state.stats.collisionCaps,
      computeMilliseconds: performance.now() - start,
    });
  }
await writeFile(
  process.argv[2] ?? "/tmp/citadel-difficulty.json",
  JSON.stringify(
    {
      kind: "Seeded bot-only bounded samples; actual level rules, three starting containers, 90 seconds including countdown",
      games,
    },
    null,
    2,
  ) + "\n",
);
console.log(
  JSON.stringify(
    games.map(({ count, difficulty, seconds, finished, peakBalls, drops }) => ({
      count,
      level: difficulty.level,
      seconds,
      finished,
      peakBalls,
      drops,
    })),
  ),
);
