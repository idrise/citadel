import { createMatch, stepMatch } from "../apps/web/src/simulation/match";
import type { PlayerCount } from "../apps/web/src/simulation/arena";
import { DEFAULT_OPTIONS, IDLE_INTENT, type BotDifficulty } from "../apps/web/src/simulation/types";
import { polygonEdges } from "../apps/web/src/simulation/polygon";
import { dot, sub } from "../apps/web/src/simulation/vector";

// Bot-only engineering evidence. This cannot establish whether ten human rounds are fun.
const cases: { count: PlayerCount; seed: number; difficulty: BotDifficulty }[] = [
  { count: 2, seed: 1, difficulty: "beginner" },
  { count: 2, seed: 21, difficulty: "standard" },
  { count: 2, seed: 2026, difficulty: "expert" },
  { count: 4, seed: 1, difficulty: "beginner" },
  { count: 4, seed: 21, difficulty: "standard" },
  { count: 4, seed: 2026, difficulty: "expert" },
  { count: 4, seed: 300, difficulty: "standard" },
  { count: 6, seed: 1, difficulty: "beginner" },
  { count: 6, seed: 21, difficulty: "standard" },
  { count: 6, seed: 2026, difficulty: "expert" },
  { count: 3, seed: 2026, difficulty: "standard" },
  { count: 5, seed: 2026, difficulty: "standard" },
];
const results = cases.map(({ count, seed, difficulty }) => {
  let state = createMatch(seed, count),
    minimumClearance = Infinity,
    morphTicks = 0;
  const options = { ...DEFAULT_OPTIONS, humanSeat: -1, botDifficulty: difficulty };
  for (let tick = 0; tick < 120 * 900 && state.phase !== "finished"; tick++) {
    state = stepMatch(state, IDLE_INTENT, options);
    if (state.morph) morphTicks++;
    for (const ball of state.balls)
      for (const edge of polygonEdges(state.arena.vertices))
        minimumClearance = Math.min(
          minimumClearance,
          dot(sub(ball.position, edge.start), edge.normal),
        );
  }
  if (state.phase !== "finished" || state.stats.collisionCaps || minimumClearance < 0.1869)
    throw new Error(
      `Invalid round ${count}/${seed}/${difficulty}: ${JSON.stringify({ phase: state.phase, stats: state.stats, minimumClearance })}`,
    );
  return {
    count,
    seed,
    difficulty,
    duration: Math.round(state.elapsed * 100) / 100,
    winner: state.winner,
    ...state.stats,
    minimumClearance,
    morphSeconds: morphTicks / 120,
    eliminations: state.eliminations,
  };
});
console.log(
  JSON.stringify(
    {
      kind: "seeded bot-only engineering runs; no human fun approval",
      options: { ...DEFAULT_OPTIONS, humanSeat: -1 },
      results,
    },
    null,
    2,
  ),
);
