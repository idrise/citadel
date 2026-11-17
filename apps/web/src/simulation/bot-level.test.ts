import { expect, it } from "vite-plus/test";
import { botLevelProfile } from "./bot-level";
import { ARENA, FIXED_DT, fortress, railPosition } from "./arena";
import { createMatch, stepMatch } from "./match";
import { planIntercept } from "./bot-planner";
import { DEFAULT_OPTIONS } from "./types";
import { angleDifference, scale, unit } from "./vector";

it("ramps all 100 levels smoothly while preserving elite reaction, aim and movement limits", () => {
  let previous = botLevelProfile(1);
  for (let level = 2; level <= 100; level++) {
    const next = botLevelProfile(level);
    for (const key of ["reaction", "jitter", "error", "serveScale"] as const)
      expect(next[key]).toBeLessThanOrEqual(previous[key] + 1e-9);
    expect(next.speed).toBeGreaterThanOrEqual(previous.speed);
    expect(next.horizon).toBeGreaterThanOrEqual(previous.horizon);
    expect(next.tactics).toBeGreaterThan(previous.tactics);
    previous = next;
  }
  expect(previous).toMatchObject({
    reaction: 0.11,
    jitter: 0.08,
    error: 0.45,
    speed: 4.8,
    tactics: 1,
  });
  expect(previous.reaction).toBeGreaterThan(FIXED_DT * 10);
  expect(previous.speed).toBeLessThan(ARENA.pointerPaddleSpeed / 2);
  expect(botLevelProfile(NaN)).toEqual(botLevelProfile(1));
});
it("forecasts visible curved flight without changing health, clocks, balls or RNG", () => {
  const state = createMatch(7, 6),
    seat = 3,
    home = fortress(seat, state.arena);
  state.phase = "playing";
  Object.assign(state.balls[0]!, {
    phase: "active",
    position: railPosition(seat, home.direction, 9, state.arena),
    velocity: scale(unit(home.direction), -24),
    spin: 1.4,
  });
  const saved = structuredClone(state),
    curved = planIntercept(state, seat, 1);
  expect(curved).not.toBeNull();
  expect(curved!.time).toBeLessThan(0.3);
  expect(Math.abs(angleDifference(curved!.angle, home.direction))).toBeGreaterThan(0.01);
  expect(state).toEqual(saved);
});
it("keeps level-100 bots inside ordinary legal movement and preserves seeded replays", () => {
  let state = createMatch(51, 4),
    replay = createMatch(51, 4);
  const options = { ...DEFAULT_OPTIONS, humanSeat: -1, botLevel: 100 };
  for (let tick = 0; tick < 300; tick++) {
    const before = state.players.map((p) => p.angle);
    state = stepMatch(state, undefined, options);
    replay = stepMatch(replay, undefined, options);
    state.players.forEach((p, i) =>
      expect(Math.abs(angleDifference(p.angle, before[i]!))).toBeLessThanOrEqual(
        botLevelProfile(100).speed * FIXED_DT + 1e-8,
      ),
    );
  }
  expect(state).toEqual(replay);
});
it("forecasts increasing rally speed from public ball state without changing it", () => {
  const state = createMatch(7, 4),
    home = fortress(0, state.arena),
    ball = state.balls[0]!;
  state.phase = "playing";
  Object.assign(ball, {
    phase: "active",
    position: railPosition(0, home.direction, 9, state.arena),
    velocity: scale(unit(home.direction), -24 * 1.5),
    rallyTime: 18,
    spin: 0,
  });
  const saved = structuredClone(state),
    intercept = planIntercept(state, 0, 0.5);
  expect(intercept).not.toBeNull();
  expect(intercept!.rallyTime).toBeGreaterThan(18);
  expect(Math.hypot(intercept!.velocity.x, intercept!.velocity.y)).toBeGreaterThan(36);
  expect(state).toEqual(saved);
});
