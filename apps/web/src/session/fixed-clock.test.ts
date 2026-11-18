import { expect, it } from "vite-plus/test";
import { ARENA, fortress, railPosition } from "../simulation/arena";
import { createMatch, stepMatch } from "../simulation/match";
import { DEFAULT_OPTIONS } from "../simulation/types";
import { scale, unit } from "../simulation/vector";
import { createFixedClock } from "./fixed-clock";

it.each([30, 60, 144])("produces 120 simulation steps in one second at %s rendered FPS", (fps) => {
  const clock = createFixedClock();
  let steps = 0;
  for (let frame = 0; frame < fps; frame++) clock.advance(1 / fps, () => steps++);
  expect(steps).toBe(120);
});
it("bounds a late frame and clears partial time on pause", () => {
  const clock = createFixedClock();
  expect(clock.advance(20, () => {})).toBe(12);
  clock.advance(0.004, () => {});
  clock.reset();
  expect(clock.advance(0.005, () => {})).toBe(0);
});

it.each([0, 0.1, -0.1])(
  "keeps bat collisions identical through a 100ms dropped frame with aim offset %s",
  (offset) => {
    const initial = createMatch(2026, 6);
    initial.phase = "playing";
    const angle = fortress(0, initial.arena).direction;
    initial.balls = [
      {
        ...initial.balls[0]!,
        phase: "active",
        position: railPosition(0, angle, ARENA.railRadius + 0.8, initial.arena),
        velocity: scale(unit(angle), -59.5),
      },
    ];
    const run = (frames: number[]) => {
      const clock = createFixedClock();
      let state = initial;
      let returns = 0;
      for (const frame of frames)
        clock.advance(frame, () => {
          state = stepMatch(
            state,
            { version: 1, steer: 0, launch: false, targetAngle: angle + offset },
            { ...DEFAULT_OPTIONS, ballSpeed: 59.5 },
          );
          returns += state.events.filter((e) => e.type === "paddle").length;
        });
      return { state, returns };
    };
    const normal = run(Array.from({ length: 12 }, () => 1 / 120));
    expect(normal.returns).toBeGreaterThan(0);
    expect(run([0.1])).toEqual(normal);
    expect(normal.state.stats.collisionCaps).toBe(0);
  },
);
