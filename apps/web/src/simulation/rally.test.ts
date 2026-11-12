import { expect, it } from "vite-plus/test";
import { advanceRally, rallyBaseSpeed, rallyMultiplier, RALLY_MAX_MULTIPLIER } from "./rally";
import { ARENA, FIXED_DT, fortress, railPosition } from "./arena";
import { createMatch, stepMatch } from "./match";
import { damagePiece, launchBall } from "./serving";
import { levelDifficulty } from "./difficulty";
import { advanceBall } from "./ball";
import { DEFAULT_OPTIONS, IDLE_INTENT, type BallState } from "./types";
import { dot, length, normalise, scale, sub, unit } from "./vector";
import { createFixedClock } from "../session/fixed-clock";

function active(): BallState {
  return { ...createMatch().balls[0]!, phase: "active", velocity: { x: 12, y: 16 }, spin: 0.7 };
}
it("starts at the level speed, ramps continuously after eight active seconds and caps pressure", () => {
  expect(rallyMultiplier(0)).toBe(1);
  expect(rallyMultiplier(8)).toBe(1);
  expect(rallyMultiplier(10)).toBeCloseTo(1.1);
  expect(rallyMultiplier(23)).toBe(RALLY_MAX_MULTIPLIER);
  expect(rallyMultiplier(10000)).toBe(RALLY_MAX_MULTIPLIER);
  const ball = active(),
    direction = normalise(ball.velocity);
  for (let tick = 0; tick < 120 * 30; tick++) advanceRally(ball, 20, FIXED_DT, true);
  expect(ball.rallyTime).toBeCloseTo(30);
  expect(length(ball.velocity)).toBeCloseTo(35);
  expect(normalise(ball.velocity)).toEqual({
    x: expect.closeTo(direction.x, 9),
    y: expect.closeTo(direction.y, 9),
  });
  expect(ball.spin).toBe(0.7);
  expect(rallyBaseSpeed(ball)).toBeCloseTo(20);
});
it("ignores waiting, zero-time, paused and legacy disabled flight without mutating metadata", () => {
  const ball = active(),
    saved = structuredClone(ball);
  for (const dt of [0, -1, NaN, Infinity]) advanceRally(ball, 20, dt, true);
  advanceRally(ball, 20, 10, false);
  expect(ball).toEqual(saved);
  ball.phase = "ready";
  const ready = structuredClone(ball);
  advanceRally(ball, 20, 20, true);
  expect(ball).toEqual(ready);
});
it("resets only the scoring ball on real damage and relaunches it at the normal level speed", () => {
  const state = createMatch(7, 4, 3, 7, levelDifficulty(50));
  state.phase = "playing";
  const ball = state.balls[0]!;
  Object.assign(ball, { phase: "active", velocity: { x: 30, y: 0 }, rallyTime: 18 });
  const other = { ...ball, id: 1, velocity: { x: 0, y: 30 } };
  state.balls.push(other);
  damagePiece(state, ball, 0, 0);
  expect(state.stats.damage).toBe(1);
  expect(ball.phase).toBe("ready");
  expect(ball.rallyTime).toBe(0);
  expect(length(ball.velocity)).toBe(0);
  expect(other.rallyTime).toBe(18);
  expect(length(other.velocity)).toBe(30);
  const options = {
    ...DEFAULT_OPTIONS,
    ballSpeed: state.difficulty!.ballSpeed,
    rallyAcceleration: true,
  };
  launchBall(state, ball, options);
  expect(length(ball.velocity)).toBeCloseTo(state.difficulty!.ballSpeed);
  expect(ball.rallyTime).toBe(0);
});
it("preserves boosted speed through actual wall and bat collisions and resets on a swept container hit", () => {
  const state = createMatch(7, 4, 3, 7, levelDifficulty(100));
  state.phase = "playing";
  const ball = state.balls[0]!,
    options = { ...DEFAULT_OPTIONS, ballSpeed: 34, rallyAcceleration: true };
  const angles = state.players.map((p) => p.angle),
    pieces = state.players.map((p) => p.pieces.map((b) => b.position));
  Object.assign(ball, {
    phase: "active",
    position: { x: 0, y: 8.75 },
    velocity: { x: 0, y: 59.5 },
    rallyTime: 40,
    spin: 0,
  });
  advanceBall(state, ball, angles, FIXED_DT, options, pieces);
  expect(state.events.some((e) => e.type === "wall")).toBe(true);
  expect(ball.velocity.y).toBeLessThan(0);
  expect(length(ball.velocity)).toBeCloseTo(59.5);
  const home = fortress(0, state.arena);
  Object.assign(ball, {
    position: railPosition(0, home.direction, ARENA.railRadius + 0.4, state.arena),
    velocity: scale(unit(home.direction), -59.5),
    rallyTime: 40,
  });
  for (let tick = 0; tick < 5 && !state.events.some((e) => e.type === "paddle"); tick++)
    advanceBall(state, ball, angles, FIXED_DT, options, pieces);
  expect(state.events.some((e) => e.type === "paddle")).toBe(true);
  expect(length(ball.velocity)).toBeCloseTo(59.5);
  const body = state.players[1]!.pieces[0]!,
    normal = unit(fortress(1, state.arena).direction);
  ball.position = {
    x: body.position.x + normal.x * (body.radius + ARENA.ballRadius + 0.05),
    y: body.position.y + normal.y * (body.radius + ARENA.ballRadius + 0.05),
  };
  ball.velocity = scale(normal, -59.5);
  advanceBall(state, ball, angles, FIXED_DT, options, pieces);
  expect(state.players[1]!.health[0]).toBe(false);
  expect(ball.phase).toBe("ready");
  expect(ball.rallyTime).toBe(0);
  expect(state.stats.collisionCaps).toBe(0);
});
it("keeps pickups in an active rally and leaves its timer and boosted speed running", () => {
  const state = createMatch(7, 4, 3, 7, levelDifficulty(100));
  state.phase = "playing";
  state.supplies = [{ id: 0, position: { x: 0, y: 0 }, age: 2 }];
  const ball = state.balls[0]!;
  Object.assign(ball, {
    phase: "active",
    position: { x: -1, y: 0 },
    velocity: { x: 59.5, y: 0 },
    rallyTime: 40,
    striker: 0,
  });
  advanceBall(
    state,
    ball,
    state.players.map((p) => p.angle),
    FIXED_DT,
    { ...DEFAULT_OPTIONS, ballSpeed: 34, rallyAcceleration: true },
    state.players.map((p) => p.pieces.map((b) => b.position)),
  );
  expect(state.events.some((e) => e.type === "collection")).toBe(true);
  expect(ball.phase).toBe("active");
  expect(ball.rallyTime).toBeGreaterThan(40);
  expect(length(ball.velocity)).toBeCloseTo(59.5);
});
it("uses the same fixed-step ramp at 30/60/144 rendering rates and preserves source state", () => {
  const snapshots = [30, 60, 144].map((fps) => {
    const ball = active(),
      clock = createFixedClock();
    for (let frame = 0; frame < fps * 12; frame++)
      clock.advance(1 / fps, () => advanceRally(ball, 20, FIXED_DT, true));
    return ball;
  });
  expect(snapshots[1]).toEqual(snapshots[0]);
  expect(snapshots[2]).toEqual(snapshots[0]);
  const before = createMatch(7, 4, 3, 7, levelDifficulty(1));
  before.phase = "playing";
  Object.assign(before.balls[0]!, {
    phase: "active",
    position: { x: 0, y: 0 },
    velocity: { x: 14, y: 0 },
    rallyTime: 10,
  });
  const saved = structuredClone(before),
    next = stepMatch(before, IDLE_INTENT, DEFAULT_OPTIONS);
  expect(before).toEqual(saved);
  expect(next.balls[0]!.rallyTime).toBeGreaterThan(10);
  expect(length(next.balls[0]!.velocity)).toBeCloseTo(14 * rallyMultiplier(10 + FIXED_DT));
  expect(
    dot(sub(next.balls[0]!.position, before.balls[0]!.position), before.balls[0]!.velocity),
  ).toBeGreaterThan(0);
});
