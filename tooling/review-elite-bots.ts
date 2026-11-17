import type { PlayerCount } from "../apps/web/src/simulation/arena";
import { writeFile } from "node:fs/promises";
import { botLevelProfile } from "../apps/web/src/simulation/bot-level";
import { levelDifficulty } from "../apps/web/src/simulation/difficulty";
import { eliteCatchTrial, eliteProxyTrial } from "./elite-bot-review";
const counts: readonly PlayerCount[] = [2, 4, 6, levelDifficulty(100).playerCount];
const catches = counts.flatMap((count) =>
  Array.from({ length: 24 }, (_, index) => eliteCatchTrial(index + 1, count)),
);
const proxy = [];
for (const count of [2, 6, levelDifficulty(100).playerCount] as const)
  for (const seed of [7, 21, 2026]) {
    const result = eliteProxyTrial(seed, count);
    proxy.push(result);
    console.log(JSON.stringify(result));
  }
const capable = [];
for (const count of [2, 6, levelDifficulty(100).playerCount] as const)
  for (const seed of [7, 21, 2026]) {
    const result = eliteProxyTrial(seed, count, 100);
    capable.push(result);
    console.log(JSON.stringify(result));
  }
// Authored-roster win regression, selected to demonstrate possibility, not estimate a win rate.
capable.push(eliteProxyTrial(20, levelDifficulty(100).playerCount, 100));
const report = {
  kind: "Seeded collision trials and fixed level-60 bot proxy; not human difficulty calibration",
  profiles: [60, 80, 90, 100].map((level) => ({ level, ...botLevelProfile(level) })),
  catches,
  proxy,
  capable,
};
await writeFile(
  process.argv[2] ?? "/tmp/citadel-elite-bots.json",
  JSON.stringify(report, null, 2) + "\n",
);
console.log(
  JSON.stringify({
    catches: catches.reduce<Record<string, number>>(
      (sum, trial) => ({ ...sum, [trial.outcome]: (sum[trial.outcome] ?? 0) + 1 }),
      {},
    ),
    proxyWins: proxy.filter((trial) => trial.won).length,
  }),
);
