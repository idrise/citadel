import { mkdir, readFile, writeFile } from "node:fs/promises";
import { PHYSICS_CASES, replayPhysics } from "./physics-fixtures";
const directory = new URL("../docs/reviews/m09/paddle-aim/", import.meta.url);
await mkdir(directory, { recursive: true });
const before = JSON.parse(
  await readFile(new URL("../docs/reviews/m03-m04/replays.json", import.meta.url), "utf8"),
) as { cases: { name: string; traceDigest: string }[] };
const cases = PHYSICS_CASES.map((name) => {
  const replay = replayPhysics(name);
  return {
    name,
    ticks: replay.ticks,
    previousDigest: before.cases.find((c) => c.name === name)?.traceDigest,
    traceDigest: replay.traceDigest,
    collisionCaps: replay.state.stats.collisionCaps,
    events: replay.events,
  };
});
await writeFile(
  new URL("replays.json", directory),
  JSON.stringify(
    {
      description:
        "Fixed-step regression traces after the owner-requested more strongly bowed paddle and contact aiming; original M03/M04 review preserved separately",
      cases,
    },
    null,
    2,
  ) + "\n",
);
console.log(
  cases.map(({ name, collisionCaps, traceDigest }) => ({ name, collisionCaps, traceDigest })),
);
