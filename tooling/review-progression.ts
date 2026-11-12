import { botLevelProfile } from "../apps/web/src/simulation/bot-level";
import { writeFile } from "node:fs/promises";
import { createMatch, stepMatch } from "../apps/web/src/simulation/match";
import { botIntent } from "../apps/web/src/simulation/bots";
import { DEFAULT_OPTIONS } from "../apps/web/src/simulation/types";
import { freshProgress, levelFor, recordResult } from "../apps/web/src/session/progression";

const calibrations = [];
for (const capacity of [25, 60, 100]) {
  let progress = freshProgress();
  const levels = [];
  for (let round = 0; round < 30; round++) {
    const level = levelFor(progress, 4);
    levels.push(level);
    progress = recordResult(progress, {
      level,
      count: 4,
      place: level <= capacity ? 1 : 4,
      at: round,
    });
  }
  calibrations.push({
    kind: "deterministic synthetic threshold player",
    capacity,
    levels,
    returningLevel: levelFor(progress, 4),
  });
}
const matches = [];
for (const count of [2, 6] as const)
  for (const level of [1, 100])
    for (const seed of [7, 21, 2026]) {
      let state = createMatch(seed, count),
        collections = 0;
      const start = performance.now();
      for (let tick = 0; tick < 120 * 120 && state.phase !== "finished"; tick++) {
        // Fixed standard proxy in the human seat. This is bot-only evidence, not a human playtest.
        const intent = botIntent(state, 0, 60);
        state = stepMatch(state, intent, { ...DEFAULT_OPTIONS, humanSeat: 0, botLevel: level });
        collections += state.events.filter((e) => e.type === "collection").length;
      }
      matches.push({
        count,
        opponentsLevel: level,
        seed,
        phase: state.phase,
        winner: state.winner,
        humanAlive: state.players[0]!.health.some(Boolean),
        seconds: state.elapsed,
        collisionCaps: state.stats.collisionCaps,
        collections,
        computeMs: performance.now() - start,
      });
      console.log(JSON.stringify(matches.at(-1)));
    }
await writeFile(
  process.argv[2] ?? "/tmp/citadel-progression.json",
  JSON.stringify(
    {
      profiles: [1, 25, 50, 75, 100].map((level) => ({ level, ...botLevelProfile(level) })),
      calibrations,
      botOnlyProxyMatches: matches,
    },
    null,
    2,
  ) + "\n",
);
