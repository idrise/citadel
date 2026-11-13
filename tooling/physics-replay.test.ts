import { readFileSync } from "node:fs";
import { expect, it } from "vite-plus/test";
import { PHYSICS_CASES, replayPhysics } from "./physics-fixtures";
import { ARENA } from "../apps/web/src/simulation/arena";

it.each(PHYSICS_CASES)(
  "replays %s with stable impact order independently of 30/60/144 FPS",
  (name) => {
    const baseline = replayPhysics(name, 30);
    for (const fps of [60, 144])
      expect(replayPhysics(name, fps).traceDigest).toBe(baseline.traceDigest);
    expect(baseline.state.stats.collisionCaps).toBe(0);
    if (name.startsWith("swipe") || name === "grazing-120") {
      const first = baseline.events[0]!;
      expect([first.type, first.seat, first.tick]).toEqual(["paddle", 0, 1]);
      if (name.startsWith("swipe"))
        expect(Math.sign(first.impact!.spin)).toBe(name === "swipe-positive" ? 1 : -1);
    }
    for (const ball of baseline.state.balls)
      if (ball.phase === "active") {
        expect(Math.abs(ball.position.x)).toBeLessThanOrEqual(
          ARENA.halfSize - ARENA.ballRadius + 1e-7,
        );
        expect(Math.abs(ball.position.y)).toBeLessThanOrEqual(
          ARENA.halfSize - ARENA.ballRadius + 1e-7,
        );
      }
    if (name === "empty-sector")
      expect(baseline.events.some((event) => event.type === "damage" && event.seat === 0)).toBe(
        false,
      );
    if (name === "health-gap")
      expect(
        baseline.events.some(
          (event) => event.type === "damage" && event.seat === 0 && event.piece === 0,
        ),
      ).toBe(false);
  },
);

it("matches the spin-bounce golden impact logs and state trace digests", () => {
  const golden = JSON.parse(
    readFileSync(new URL("../docs/reviews/m09/spin-bounce/replays.json", import.meta.url), "utf8"),
  ) as { cases: { name: (typeof PHYSICS_CASES)[number]; traceDigest: string }[] };
  for (const fixture of golden.cases)
    expect(replayPhysics(fixture.name).traceDigest).toBe(fixture.traceDigest);
  const corner = replayPhysics("corner-240");
  expect(corner.events.slice(0, 2).map((event) => event.impact!.normal)).toEqual([
    { x: -1, y: 0 },
    { x: 0, y: -1 },
  ]);
  expect(
    corner.events.every((event) => event.type === "wall" && event.ballId === 0 && event.impact),
  ).toBe(true);
});
