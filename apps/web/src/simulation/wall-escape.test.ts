import { expect, it } from "vite-plus/test";
import { advanceBall } from "./ball";
import { advanceBalls } from "./balls";
import { ARENA, FIXED_DT, fortress, railPosition } from "./arena";
import { createMatch, stepMatch } from "./match";
import { resolveLevel } from "./levels";
import { DEFAULT_OPTIONS, IDLE_INTENT } from "./types";
import { curveFlight, MAX_SWIPE_CURVE, spinBounce } from "./flight";
import { damagePiece, launchBall } from "./serving";
import { SUPPLIES } from "./supplies";
import { dot, length, scale, unit } from "./vector";
import { bounceWall } from "./wall-escape";
import { planIntercept } from "./bot-planner";

function roundedRally(shared = false) {
  const state = createMatch(7, 4, 3, 7, {
    ...resolveLevel(1),
    playerCount: 4,
    arenaShape: "rounded",
  });
  state.phase = "playing";
  const ball = state.balls[0]!;
  Object.assign(ball, {
    phase: "active",
    position: { x: 0, y: 0 },
    velocity: { x: 24, y: 0 },
    spin: 0,
  });
  const angles = state.players.map((player) => player.angle),
    pieces = state.players.map((player) => player.pieces.map((body) => body.position));
  const step = () => {
    state.events = [];
    state.elapsed += FIXED_DT;
    if (shared) advanceBalls(state, [ball], angles, FIXED_DT, DEFAULT_OPTIONS, pieces);
    else advanceBall(state, ball, angles, FIXED_DT, DEFAULT_OPTIONS, pieces);
    return state.events;
  };
  return { state, ball, step };
}

it.each([false, true])("adds spin on the fifth real wall bounce (shared solver: %s)", (shared) => {
  const { state, step } = roundedRally(shared);
  let walls = 0;
  for (let tick = 0; tick < 120 * 12 && walls < 5; tick++) {
    for (const event of step()) {
      if (event.type !== "wall") continue;
      walls++;
      if (walls <= 4) expect(event.impact!.spin).toBe(0);
      else expect(Math.abs(event.impact!.spin)).toBeGreaterThan(0);
    }
  }
  expect(walls).toBe(5);
  expect(state.stats.collisionCaps).toBe(0);
});

it.each([false, true])("breaks the rounded side-to-side deadlock (shared solver: %s)", (shared) => {
  const { state, step } = roundedRally(shared);
  let contactAt: number | undefined;
  for (let tick = 0; tick < 120 * 20 && contactAt === undefined; tick++) {
    if (step().some((event) => event.type === "paddle" || event.type === "damage"))
      contactAt = state.elapsed;
  }
  expect(contactAt).toBeDefined();
  expect(contactAt!).toBeLessThan(12);
  expect(state.stats.collisionCaps).toBe(0);
});

it("increases the nudge on later banks despite flight decay, preserving speed and inward departure", () => {
  for (const id of [0, 1]) {
    let ball = { id, velocity: { x: 24, y: 0 }, spin: 0, wallBounces: 0 };
    let previous = 0;
    for (let bank = 1; bank <= 40; bank++) {
      const normal = { x: bank % 2 ? -1 : 1, y: 0 };
      ball.velocity = scale(normal, -24);
      ball.spin = curveFlight(ball.velocity, ball.spin, 1).spin;
      const rebound = bounceWall(ball, normal);
      expect(rebound.wallBounces).toBe(bank);
      expect(length(rebound.velocity)).toBeCloseTo(24, 10);
      expect(dot(rebound.velocity, normal)).toBeGreaterThan(0);
      expect(Math.abs(rebound.spin)).toBeLessThanOrEqual(MAX_SWIPE_CURVE);
      if (bank <= 4) expect(rebound.spin).toBe(0);
      else {
        expect(Math.abs(rebound.spin)).toBeGreaterThanOrEqual(previous);
        expect(Math.sign(rebound.spin)).toBe(id === 0 ? 1 : -1);
      }
      previous = Math.abs(rebound.spin);
      ball = { id, ...rebound };
    }
  }
});

it("preserves ordinary spun banks exactly before the threshold and keeps existing spin direction", () => {
  for (const spin of [-1.2, 1.2]) {
    const ball = { id: 0, velocity: { x: 24, y: 0 }, spin },
      normal = { x: -1, y: 0 };
    expect(bounceWall(ball, normal)).toEqual({
      ...spinBounce(ball.velocity, normal, spin),
      wallBounces: 1,
    });
    const saved = structuredClone(ball);
    const escaped = bounceWall({ ...ball, wallBounces: 8 }, normal);
    expect(Math.sign(escaped.spin)).toBe(Math.sign(spin));
    expect(Math.abs(escaped.spin)).toBeLessThanOrEqual(MAX_SWIPE_CURVE);
    expect(ball).toEqual(saved);
  }
});

it("clears the bank count on a real bat return", () => {
  const { state, ball, step } = roundedRally();
  const home = fortress(0, state.arena);
  Object.assign(ball, {
    position: railPosition(0, home.direction, ARENA.railRadius + 0.37, state.arena),
    velocity: scale(unit(home.direction), -24),
    wallBounces: 9,
    spin: 0,
  });
  for (let tick = 0; tick < 5 && state.stats.paddleHits === 0; tick++) step();
  expect(state.stats.paddleHits).toBe(1);
  expect(ball.wallBounces).toBe(0);
  expect(ball.spin).toBe(0);
});

it("resets only the scoring ball on revenge serve and also clears stale counts at launch", () => {
  const { state, ball } = roundedRally();
  ball.wallBounces = 9;
  const other = { ...ball, id: 1, wallBounces: 6 };
  state.balls.push(other);
  damagePiece(state, ball, 0, 0);
  expect(ball.phase).toBe("ready");
  expect(ball.wallBounces).toBe(0);
  expect(ball.spin).toBe(0);
  expect(other.wallBounces).toBe(6);
  ball.wallBounces = 9;
  launchBall(state, ball, DEFAULT_OPTIONS);
  expect(ball.wallBounces).toBe(0);
});

it.each(["pickup", "shield"] as const)("does not count a %s as a wall bank", (kind) => {
  const { state, ball, step } = roundedRally();
  ball.wallBounces = 4;
  let target = { x: 0, y: 0 };
  if (kind === "pickup") state.supplies = [{ id: 0, position: target, age: SUPPLIES.fall + 0.1 }];
  else {
    state.players[0]!.protectedUntil = 10;
    target = state.players[0]!.pieces[0]!.position;
  }
  const radius = kind === "pickup" ? SUPPLIES.radius : state.players[0]!.pieces[0]!.radius;
  ball.position = { x: target.x + radius + ARENA.ballRadius + 0.02, y: target.y };
  ball.velocity = { x: -24, y: 0 };
  step();
  expect(
    state.events.some((event) => event.type === (kind === "pickup" ? "collection" : "shield")),
  ).toBe(true);
  expect(ball.wallBounces).toBe(4);
  expect(ball.spin).toBe(0);
});

it("copies bank history through fixed steps without changing the input state or RNG", () => {
  const { state, ball } = roundedRally();
  Object.assign(ball, {
    wallBounces: 4,
    position: {
      x: Math.max(...state.arena.vertices.map((point) => point.x)) - ARENA.ballRadius - 0.02,
      y: 0,
    },
  });
  const saved = structuredClone(state),
    options = { ...DEFAULT_OPTIONS, humanSeat: 0, serveTimeout: Infinity };
  const next = stepMatch(state, IDLE_INTENT, options);
  expect(state).toEqual(saved);
  expect(next).toEqual(stepMatch(state, IDLE_INTENT, options));
  expect(next.balls[0]!.wallBounces).toBe(5);
  expect(Math.abs(next.balls[0]!.spin!)).toBeGreaterThan(0);
});

it("includes the next escape nudge in bot interception forecasts without changing the live ball", () => {
  const state = createMatch(7, 2),
    ball = state.balls[0]!;
  state.phase = "playing";
  Object.assign(ball, {
    phase: "active",
    position: { x: 5, y: 3 },
    velocity: { x: 20, y: 20 },
    spin: 0,
    wallBounces: 4,
  });
  const saved = structuredClone(state),
    escaped = planIntercept(state, 0, 1);
  expect(escaped).not.toBeNull();
  expect(escaped!.spin).toBeGreaterThan(0);
  expect(state).toEqual(saved);
  ball.wallBounces = 0;
  const ordinary = planIntercept(state, 0, 1);
  expect(ordinary).not.toBeNull();
  expect(ordinary!.spin).toBe(0);
  expect(escaped!.angle).not.toBeCloseTo(ordinary!.angle, 4);
});
