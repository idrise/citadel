import { expect, it } from "vite-plus/test";
import { botLevelProfile } from "./bot-level";
import { ARENA, FIXED_DT, fortress, railPosition } from "./arena";
import { createMatch, stepMatch } from "./match";
import { planIntercept } from "./bot-planner";
import { DEFAULT_OPTIONS } from "./types";
import { angleDifference, scale, unit } from "./vector";

it("ramps all 100 levels continuously up to zero-error physics-tick reaction and the human pointer speed cap", () => {
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
    reaction: FIXED_DT,
    jitter: 0,
    error: 0,
    speed: ARENA.pointerPaddleSpeed,
    tactics: 1,
  });
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
        ARENA.pointerPaddleSpeed * FIXED_DT + 1e-8,
      ),
    );
  }
  expect(state).toEqual(replay);
});
