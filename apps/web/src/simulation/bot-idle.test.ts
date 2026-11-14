import { expect, it } from "vite-plus/test";
import { createMatch, stepMatch } from "./match";
import { botIntent } from "./bots";
import { botLevelProfile } from "./bot-level";
import { fortress, railPosition, FIXED_DT } from "./arena";
import { DEFAULT_OPTIONS } from "./types";
import { angleDifference, scale, unit } from "./vector";

function idle() {
  const state = createMatch(2026, 6);
  state.phase = "playing";
  Object.assign(state.balls[0]!, {
    phase: "active",
    position: { x: 0, y: 0 },
    velocity: { x: 0, y: 0 },
  });
  return state;
}
it("looks at distant visible play at bounded intervals without consuming gameplay randomness", () => {
  const state = idle(),
    rng = state.rng,
    home = fortress(0, state.arena);
  state.balls[0]!.position = { x: 3, y: 2 };
  const first = botIntent(state, 0, 1);
  expect(Math.abs(angleDifference(first.targetAngle!, home.direction))).toBeGreaterThan(0);
  const target = first.targetAngle;
  state.elapsed = 0.1;
  expect(botIntent(state, 0, 1).targetAngle).toBe(target);
  expect(state.bots[0]!.idleAt).toBeGreaterThanOrEqual(botLevelProfile(1).reaction);
  expect(state.rng).toBe(rng);
});
it("is deterministic, freezes outside play and returns to neutral when no balls are active", () => {
  const a = idle(),
    b = structuredClone(a);
  for (let i = 0; i < 40; i++) {
    a.elapsed = b.elapsed = i * 0.5;
    expect(botIntent(a, 1, 50)).toEqual(botIntent(b, 1, 50));
  }
  a.balls = [];
  for (let i = 0; i < 30; i++) {
    a.elapsed += 0.5;
    botIntent(a, 1, 50);
  }
  expect(a.bots[1]!.targetAngle).toBeCloseTo(fortress(1, a.arena).direction, 10);
  a.phase = "countdown";
  const before = a.bots[1]!.targetAngle;
  a.elapsed += 10;
  expect(botIntent(a, 1, 50).targetAngle).toBe(before);
});
it("uses normal motor limits and immediately yields idle timing to an incoming defence", () => {
  let state = idle();
  const rng = state.rng;
  for (let i = 0; i < 120; i++) {
    const before = state.players.map((p) => p.angle);
    state = stepMatch(state, undefined, { ...DEFAULT_OPTIONS, humanSeat: -1, botLevel: 1 });
    state.players.forEach((p, id) =>
      expect(Math.abs(angleDifference(p.angle, before[id]!))).toBeLessThanOrEqual(
        2 * FIXED_DT + 1e-8,
      ),
    );
  }
  expect(state.rng).toBe(rng);
  state.bots[0]!.idleAt = 100;
  const home = fortress(0, state.arena);
  Object.assign(state.balls[0]!, {
    position: railPosition(0, home.direction, 6, state.arena),
    velocity: scale(unit(home.direction), -24),
  });
  const idleAt = state.bots[0]!.idleAt;
  botIntent(state, 0, 100);
  expect(state.bots[0]!.idleAt).toBe(idleAt);
  expect(state.bots[0]!.stroke).toBeDefined();
});
