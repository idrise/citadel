import { expect, it } from "vite-plus/test";
import { ARENA, FIXED_DT } from "./arena";
import { sweepBalls, resolveBallContact } from "./ball-contact";
import { curveFlight, MAX_SWIPE_CURVE } from "./flight";
import { createMatch, stepMatch } from "./match";
import { advanceBalls } from "./balls";
import { advanceBall } from "./ball";
import { DEFAULT_OPTIONS, type BallState, type MatchState } from "./types";
import { add, dot, length, scale, sub, unit } from "./vector";

const ball = (id: number, x: number, y: number, vx: number, vy: number, spin = 0): BallState => ({
  id,
  phase: "active",
  seat: id % 2,
  striker: id % 2,
  age: 0,
  slowSeat: null,
  position: { x, y },
  velocity: { x: vx, y: vy },
  spin,
});
function advance(state: MatchState, dt = FIXED_DT) {
  advanceBalls(
    state,
    state.balls,
    state.players.map((p) => p.angle),
    dt,
    DEFAULT_OPTIONS,
    state.players.map((p) => p.pieces.map((b) => b.position)),
  );
}
function fixture(balls: BallState[]) {
  const state = createMatch(7, 4);
  state.phase = "playing";
  state.balls = balls;
  state.nextBallId = Math.max(...balls.map((b) => b.id)) + 1;
  return state;
}

it("sweeps both fast-moving bodies, including unequal speeds, and rejects a near miss and tangent", () => {
  const a = ball(0, -1, 0, 200, 0),
    b = ball(1, 1, 0, -100, 0);
  const hit = sweepBalls(a, b, a.velocity, b.velocity, FIXED_DT)!;
  expect(hit.time).toBeCloseTo((2 - 2 * ARENA.ballRadius) / 300, 12);
  expect(hit.normal).toEqual({ x: -1, y: 0 });
  for (const y of [2 * ARENA.ballRadius, 2 * ARENA.ballRadius + 0.001]) {
    b.position.y = y;
    expect(sweepBalls(a, b, a.velocity, b.velocity, FIXED_DT)).toBeNull();
  }
  b.position = { x: -1 + 2 * ARENA.ballRadius, y: 0 };
  b.velocity = { x: 300, y: 0 };
  expect(sweepBalls(a, b, a.velocity, b.velocity, FIXED_DT)).toBeNull();
});

it("exchanges normal momentum and signed spin, retains tangents and conserves kinetic energy", () => {
  for (const angle of [0, 0.7, 2, 4]) {
    const n = unit(angle),
      t = unit(angle + Math.PI / 2);
    const a = ball(0, 0, 0, 0, 0, MAX_SWIPE_CURVE),
      b = ball(1, 0, 0, 0, 0, -0.4);
    a.position = scale(n, ARENA.ballRadius);
    b.position = scale(n, -ARENA.ballRadius);
    a.velocity = add(scale(n, -30), scale(t, 10));
    b.velocity = add(scale(n, 15), scale(t, -7));
    const energy = dot(a.velocity, a.velocity) + dot(b.velocity, b.velocity);
    expect(resolveBallContact(a, b, n)).toBe(true);
    expect(dot(a.velocity, n)).toBeCloseTo(15, 10);
    expect(dot(b.velocity, n)).toBeCloseTo(-30, 10);
    expect(dot(a.velocity, t)).toBeCloseTo(10, 10);
    expect(dot(b.velocity, t)).toBeCloseTo(-7, 10);
    expect(dot(a.velocity, a.velocity) + dot(b.velocity, b.velocity)).toBeCloseTo(energy, 9);
    expect(a.spin).toBe(-0.4);
    expect(b.spin).toBe(MAX_SWIPE_CURVE);
    expect(length(sub(a.position, b.position))).toBeGreaterThan(ARENA.ballRadius * 2);
    expect(sweepBalls(a, b, a.velocity, b.velocity, FIXED_DT)).toBeNull();
  }
});

it("transfers a single ball's curve to the destination and the next flight follows its new sign", () => {
  const a = ball(0, -ARENA.ballRadius, 0, 24, 0, -1),
    b = ball(1, ARENA.ballRadius, 0, -24, 0, 0);
  resolveBallContact(a, b, { x: -1, y: 0 });
  expect(a.spin).toBe(0);
  expect(b.spin).toBe(-1);
  expect(curveFlight(b.velocity, b.spin, 0.1).velocity.y).toBeLessThan(0);
});

it("resolves exact and separating overlaps once without duplicate impulses, spin swaps, NaNs or RNG", () => {
  for (const velocities of [
    [24, -24],
    [24, 24],
    [-24, 24],
    [0, 0],
  ]) {
    const state = fixture([ball(0, 0, 0, velocities[0]!, 0), ball(1, 0, 0, velocities[1]!, 0)]);
    const rng = state.rng;
    advance(state);
    expect(state.stats.collisionCaps).toBe(0);
    expect(state.rng).toBe(rng);
    expect(length(sub(state.balls[0]!.position, state.balls[1]!.position))).toBeGreaterThanOrEqual(
      2 * ARENA.ballRadius,
    );
    expect(state.events.filter((e) => e.type === "ball").length).toBeLessThanOrEqual(1);
    expect(
      state.balls
        .flatMap((b) => [b.position.x, b.position.y, b.velocity.x, b.velocity.y])
        .every(Number.isFinite),
    ).toBe(true);
  }
  const a = ball(0, -0.1, 0, -24, 0, 1),
    b = ball(1, 0.1, 0, 24, 0, -1);
  resolveBallContact(a, b, { x: -1, y: 0 });
  expect([a.velocity.x, b.velocity.x, a.spin, b.spin]).toEqual([-24, 24, 1, -1]);
});

it("resolves a swept crossing in live stepMatch without mutating input or exchanging attribution", () => {
  const previous = fixture([ball(0, -0.3, 0, 59.5, 0, 0.8), ball(1, 0.3, 0, -59.5, 0)]);
  const saved = structuredClone(previous);
  const next = stepMatch(previous);
  expect(previous).toEqual(saved);
  expect(next.events.filter((e) => e.type === "ball")).toHaveLength(1);
  expect(next.events.find((e) => e.type === "ball")).toMatchObject({ ballId: 0, otherBallId: 1 });
  expect(next.balls[0]!.velocity.x).toBeLessThan(0);
  expect(next.balls[1]!.velocity.x).toBeGreaterThan(0);
  expect(next.balls.map((b) => b.striker)).toEqual([0, 1]);
  expect(next.balls[1]!.spin).toBeGreaterThan(0.7);
  for (const ball of next.balls) expect(length(ball.velocity)).toBeCloseTo(59.5, 10);
  expect(next.stats.damage).toBe(0);
  expect(next.stats.collisionCaps).toBe(0);
});

it("separates overlapping co-moving launch queues without spending the real-impact budget", () => {
  const state = fixture([0, 1, 2].map((id) => ball(id, id * 0.238, 0, 24, 0)));
  advance(state);
  expect(state.stats.collisionCaps).toBe(0);
  expect(state.events).toEqual([]);
  for (let i = 1; i < state.balls.length; i++)
    expect(
      length(sub(state.balls[i]!.position, state.balls[i - 1]!.position)),
    ).toBeGreaterThanOrEqual(2 * ARENA.ballRadius - 1e-7);
});

it("keeps unequal-speed overtaking pairs departing with conserved momentum and energy", () => {
  for (let i = 1; i <= 100; i++) {
    const normal = unit(i * 2.399963);
    const a = ball(0, 0, 0, 0, 0),
      b = ball(1, 0, 0, 0, 0);
    a.position = scale(normal, ARENA.ballRadius);
    b.position = scale(normal, -ARENA.ballRadius);
    a.velocity = scale(unit(i * 1.53), 14 + (i % 46));
    b.velocity = scale(unit(i * 0.77), 14 + ((i * 13) % 46));
    const momentum = add(a.velocity, b.velocity),
      energy = dot(a.velocity, a.velocity) + dot(b.velocity, b.velocity);
    const closing = dot(sub(a.velocity, b.velocity), normal);
    const bounced = resolveBallContact(a, b, normal);
    expect(bounced).toBe(closing < -1e-8);
    expect(add(a.velocity, b.velocity).x).toBeCloseTo(momentum.x, 10);
    expect(add(a.velocity, b.velocity).y).toBeCloseTo(momentum.y, 10);
    expect(dot(a.velocity, a.velocity) + dot(b.velocity, b.velocity)).toBeCloseTo(energy, 8);
    expect(dot(sub(a.velocity, b.velocity), normal)).toBeGreaterThanOrEqual(-1e-8);
  }
});

it("ignores ready balls and does not advance a newly launched ball until the next tick", () => {
  const state = fixture([ball(0, -0.3, 0, 59.5, 0), { ...ball(1, 0, 0, 0, 0), phase: "ready" }]);
  const ready = structuredClone(state.balls[1]!);
  advance(state);
  expect(state.balls[0]!.velocity.x).toBe(59.5);
  expect(state.balls[1]).toEqual(ready);
  expect(state.events).toHaveLength(0);
  const opening = createMatch(7);
  opening.phase = "playing";
  opening.balls[0]!.age = 10;
  const next = stepMatch(opening);
  expect(next.balls[0]!.phase).toBe("active");
  expect(next.balls[0]!.position).toEqual(opening.balls[0]!.position);
});

it("orders ball, wall and ball-again contacts chronologically and handles remaining tick travel", () => {
  const state = fixture([ball(0, 0, 0, 24, 0), ball(1, 0.5, 0, -24, 0)]);
  // A short separation gives one pair collision followed by free flight.
  advance(state);
  const hit = state.events[0]!;
  expect(hit.impact!.time).toBeCloseTo((0.5 - 2 * ARENA.ballRadius) / 48, 12);
  expect(state.balls[0]!.position.x).toBeLessThan(0);
  expect(state.balls[1]!.position.x).toBeGreaterThan(0.5);
  // An ordinary wall can occur before a predicted pair. Re-query from the rebound.
  const world = createMatch(7, 2);
  world.phase = "playing";
  const right = Math.max(...world.arena.vertices.map((p) => p.x)) - ARENA.ballRadius;
  world.balls = [ball(0, right - 0.05, 0, 24, 0), ball(1, right - 0.6, 0, 24, 0)];
  advance(world, 0.02);
  expect(world.events.slice(0, 2).map((e) => e.type)).toEqual(["wall", "ball"]);
  expect(world.events.map((e) => e.impact!.time)).toEqual(
    world.events.map((e) => e.impact!.time).toSorted((a, b) => a - b),
  );
  expect(world.stats.collisionCaps).toBe(0);
});

it("repeats simultaneous chains independently of array order and preserves a lone ball's world solver", () => {
  const initial = fixture([ball(5, -0.5, 0, 24, 0), ball(2, 0, 0, 0, 0), ball(9, 0.5, 0, -24, 0)]);
  const reversed = structuredClone(initial);
  reversed.balls.reverse();
  advance(initial);
  advance(reversed);
  expect(initial.events).toEqual(reversed.events);
  expect(initial.balls.toSorted((a, b) => a.id - b.id)).toEqual(
    reversed.balls.toSorted((a, b) => a.id - b.id),
  );
  expect(initial.stats.collisionCaps).toBe(0);
  for (const count of [2, 4, 6] as const) {
    const a = createMatch(7, count);
    a.phase = "playing";
    a.balls = [ball(0, 0, 0, 24, 5, -1.2)];
    const b = structuredClone(a),
      angles = a.players.map((p) => p.angle),
      pieces = a.players.map((p) => p.pieces.map((b) => b.position));
    advanceBall(a, a.balls[0]!, angles, FIXED_DT, DEFAULT_OPTIONS, pieces);
    advance(b);
    expect(b).toEqual(a);
  }
});

it("resolves destination damage before a later pair and never hits a consumed revenge-serve ball", () => {
  const state = fixture([]);
  const piece = state.players[0]!.pieces[0]!,
    direction = unit(state.players[0]!.angle);
  const start = add(piece.position, scale(direction, piece.radius + ARENA.ballRadius + 0.01));
  state.balls = [
    { ...ball(0, start.x, start.y, 0, 0), velocity: scale(direction, -24) },
    {
      ...ball(1, start.x + direction.x * 0.5, start.y + direction.y * 0.5, 0, 0),
      velocity: scale(direction, -59.5),
    },
  ];
  advance(state);
  expect(state.events[0]!.type).toBe("damage");
  expect(state.events.filter((e) => e.type === "ball")).toHaveLength(0);
  expect(state.balls[0]!.phase).toBe("ready");
  expect(state.balls[0]!.seat).toBe(0);
  expect(state.stats.collisionCaps).toBe(0);
});
