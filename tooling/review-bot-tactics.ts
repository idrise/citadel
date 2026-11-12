import { writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { createMatch, stepMatch } from "../apps/web/src/simulation/match";
import { DEFAULT_OPTIONS } from "../apps/web/src/simulation/types";
import { FIXED_DT } from "../apps/web/src/simulation/arena";

// Bounded bot-only smoke sample, not a human difficulty calibration or pacing study.
const games = [];
for (const level of [1, 50, 100])
  for (const count of [2, 4, 6] as const) {
    let state = createMatch(2026, count),
      curves = 0,
      collections = 0;
    const began = performance.now();
    for (let tick = 0; tick < 122 / FIXED_DT && state.phase !== "finished"; tick++) {
      state = stepMatch(state, undefined, { ...DEFAULT_OPTIONS, humanSeat: -1, botLevel: level });
      for (const event of state.events) {
        if (event.type === "paddle" && Math.abs(event.impact?.spin ?? 0) > 0.2) curves++;
        if (event.type === "collection") collections++;
      }
    }
    assert.equal(state.stats.collisionCaps, 0);
    if (level === 100) {
      assert.ok(curves > 0);
      assert.ok(collections > 0);
    }
    games.push({
      level,
      count,
      elapsed: state.elapsed,
      finished: state.phase === "finished",
      winner: state.winner,
      curves,
      collections,
      collisionCaps: state.stats.collisionCaps,
      computeMilliseconds: performance.now() - began,
    });
  }
const report = {
  kind: "Seed 2026; three initial containers; bot-only; bounded 122 seconds including countdown",
  games,
};
if (process.argv[2]) await writeFile(process.argv[2], JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify(report, null, 2));
