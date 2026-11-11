import { PHYSICS_CASES, replayPhysics } from "./physics-fixtures";
console.log(
  JSON.stringify(
    {
      description:
        "Two-second fixed-step regression fixtures; corner/eight-curves isolate wall geometry, others retain defenders",
      cases: PHYSICS_CASES.map((name) => {
        const { state, events, ...result } = replayPhysics(name);
        return { ...result, collisionCaps: state.stats.collisionCaps, events };
      }),
    },
    null,
    2,
  ),
);
