import { createMatch, stepMatch } from "../apps/web/src/simulation/match";
import { levelDifficulty } from "../apps/web/src/simulation/difficulty";
import { fitDefenceLimits } from "../apps/web/src/simulation/defence-limits";
import { createPieceBodies } from "../apps/web/src/simulation/health";
import { readyBall } from "../apps/web/src/simulation/serving";
import { DEFAULT_OPTIONS } from "../apps/web/src/simulation/types";
const samples = [];
for (const level of [1, 50, 100])
  for (const seed of [1, 7, 2026])
    for (const previous of [true, false]) {
      let state = createMatch(seed, 3, 3, seed, levelDifficulty(level));
      if (previous) {
        state.arena = fitDefenceLimits({
          ...state.arena,
          batWallGap: 0.015,
          fortresses: state.arena.fortresses.map((home, index) => ({
            ...home,
            anchor: {
              x: (state.arena.vertices[index]!.x * 11.8) / 13,
              y: (state.arena.vertices[index]!.y * 11.8) / 13,
            },
          })),
        });
        state.players.forEach((p) => {
          p.pieces = createPieceBodies(p.id, state.arena, 3);
        });
        state.balls = state.balls.map((b) => readyBall(state, b.seat, b.id));
      }
      for (let tick = 0; tick < 120 * 120 && state.phase !== "finished"; tick++)
        state = stepMatch(state, undefined, { ...DEFAULT_OPTIONS, humanSeat: -1 });
      samples.push({
        level,
        seed,
        previous,
        phase: state.phase,
        seconds: state.elapsed,
        damage: state.stats.damage,
        collisionCaps: state.stats.collisionCaps,
      });
    }
console.log(
  JSON.stringify(
    {
      kind: "Node bot-only comparison; identical seeds and rules, previous 1.2-unit/.015-gap triangle versus current geometry; 120-second censoring",
      samples,
    },
    null,
    2,
  ),
);
