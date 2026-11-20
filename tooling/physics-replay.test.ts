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
    if (name.startsWith("ball-") || name === "wall-ball")
      expect(baseline.events.some((e) => e.type === "ball" && e.otherBallId !== undefined)).toBe(
        true,
      );
    if (name.startsWith("swipe") || name === "grazing-120") {
      const first = baseline.events[0]!;
      expect([first.type, first.seat, first.tick]).toEqual(["paddle", 0, 1]);
      if (name.startsWith("swipe"))
        expect(Math.sign(first.impact!.spin)).toBe(name === "swipe-positive" ? -1 : 1);
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

it("retains reviewed impacts through four wall banks and matches the escape-enabled traces", () => {
  const golden = JSON.parse(
    readFileSync(
      new URL("../docs/reviews/m09/replay-tokens-collisions/replays.json", import.meta.url),
      "utf8",
    ),
  ) as {
    cases: {
      name: (typeof PHYSICS_CASES)[number];
      traceDigest: string;
      events: ReturnType<typeof replayPhysics>["events"];
    }[];
  };
  const updated = JSON.parse(
    readFileSync(
      new URL("../docs/reviews/wall-escape/replay-digests.json", import.meta.url),
      "utf8",
    ),
  ) as { cases: { name: (typeof PHYSICS_CASES)[number]; traceDigest: string }[] };
  for (const fixture of golden.cases) {
    const replay = replayPhysics(fixture.name),
      banks = new Map<number, number>();
    const firstNudge = fixture.events.findIndex((event) => {
      if (event.ballId === undefined) return false;
      if (["paddle", "launch", "damage"].includes(event.type)) banks.set(event.ballId, 0);
      if (event.type !== "wall") return false;
      const count = (banks.get(event.ballId) ?? 0) + 1;
      banks.set(event.ballId, count);
      return count > 4;
    });
    if (firstNudge < 0) expect(replay.traceDigest).toBe(fixture.traceDigest);
    else
      // Stored JSON normalises signed zero; compare in the same representation.
      expect(JSON.parse(JSON.stringify(replay.events.slice(0, firstNudge)))).toEqual(
        fixture.events.slice(0, firstNudge),
      );
    expect(replay.traceDigest).toBe(
      updated.cases.find((item) => item.name === fixture.name)!.traceDigest,
    );
  }
  const corner = replayPhysics("corner-240");
  expect(corner.events.slice(0, 2).map((event) => event.impact!.normal)).toEqual([
    { x: -1, y: 0 },
    { x: 0, y: -1 },
  ]);
  expect(
    corner.events.every((event) => event.type === "wall" && event.ballId === 0 && event.impact),
  ).toBe(true);
});
