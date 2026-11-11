import { expect, it } from "vite-plus/test";
import { ARENA, FIXED_DT, fortress, railPosition } from "./arena";
import { advanceBall } from "./ball";
import {
  contactSwipe,
  curveFlight,
  CURVE_DECAY,
  MAX_SWIPE_CURVE,
  rememberSwipe,
  swipeCurve,
  SWIPE_WINDOW,
} from "./flight";
import { createMatch, stepMatch } from "./match";
import { predictReturn } from "./return-preview";
import { DEFAULT_OPTIONS, IDLE_INTENT } from "./types";
import { angleDifference, angleOf, length, scale, unit } from "./vector";

it("preserves a straight zero-spin flight exactly and bounds curve without adding speed", () => {
  const velocity = { x: 24, y: 0 };
  expect(curveFlight(velocity, 0, FIXED_DT).velocity).toBe(velocity);
  let current = velocity,
    spin = MAX_SWIPE_CURVE;
  for (let tick = 0; tick < 720; tick++) {
    const next = curveFlight(current, spin, FIXED_DT);
    current = next.velocity;
    spin = next.spin;
    expect(length(current)).toBeCloseTo(24, 10);
  }
  expect(angleOf(current)).toBeGreaterThan(0.77);
  expect(angleOf(current)).toBeLessThanOrEqual(MAX_SWIPE_CURVE / CURVE_DECAY);
  expect(spin).toBeLessThan(0.001);
  expect(swipeCurve(0, { x: -24, y: 0 }, { x: 1, y: 0 })).toBe(0);
  expect(swipeCurve(100, { x: -24, y: 0 }, { x: 1, y: 0 })).toBe(MAX_SWIPE_CURVE);
});

it("makes an ordinary swipe visibly bend the path while preserving ball speed", () => {
  let velocity = { x: 24, y: 0 };
  let spin = swipeCurve(ARENA.paddleSpeed * 0.5, { x: -24, y: 0 }, { x: 1, y: 0 });
  let lateral = 0;
  for (let tick = 0; tick < 60; tick++) {
    const next = curveFlight(velocity, spin, FIXED_DT);
    velocity = next.velocity;
    spin = next.spin;
    lateral += velocity.y * FIXED_DT;
  }
  expect(lateral).toBeGreaterThan(2);
  expect(angleOf(velocity)).toBeGreaterThan(0.3);
  expect(length(velocity)).toBeCloseTo(24, 10);
});

it("remembers actual motion briefly, reverses immediately, and expires without adding bat lag", () => {
  const start = rememberSwipe(undefined, ARENA.paddleSpeed, FIXED_DT);
  expect(start.remaining).toBe(SWIPE_WINDOW);
  const recent = rememberSwipe(start, 0, 0.05);
  expect(contactSwipe(recent, 0)).toBeCloseTo(ARENA.paddleSpeed * 0.5);
  expect(contactSwipe(recent, -1)).toBe(-1);
  expect(rememberSwipe(recent, -ARENA.paddleSpeed, FIXED_DT).velocity).toBe(-ARENA.paddleSpeed);
  expect(contactSwipe(rememberSwipe(recent, 0, 0.06), 0)).toBe(0);
  expect(start.remaining).toBe(SWIPE_WINDOW);
});

it.each([-1, 1])(
  "a swipe shortly before contact still curves side %s after the bat has stopped",
  (side) => {
    let state = createMatch();
    state.phase = "playing";
    const base = fortress(0).direction;
    state.players[0]!.angle = base - side * ARENA.paddleSpeed * FIXED_DT;
    state.balls = [
      {
        ...state.balls[0]!,
        phase: "active",
        position: railPosition(0, base, 6),
        velocity: scale(unit(base), -24),
      },
    ];
    state = stepMatch(state, { ...IDLE_INTENT, targetAngle: base });
    const heldAngle = state.players[0]!.angle;
    for (let tick = 0; tick < 12 && !state.events.some((e) => e.type === "paddle"); tick++)
      state = stepMatch(state, IDLE_INTENT);
    expect(state.events.find((e) => e.type === "paddle")?.seat).toBe(0);
    expect(state.players[0]!.angle).toBe(heldAngle);
    expect(Math.sign(state.balls[0]!.spin ?? 0)).toBe(side);
    expect(Math.abs(state.balls[0]!.spin ?? 0)).toBeGreaterThan(0.6);
  },
);

it.each([-1, 1])("imparts a small signed curve for a moving paddle on side %s", (side) => {
  const state = createMatch();
  state.phase = "playing";
  const base = fortress(0).direction;
  state.balls = [
    {
      ...state.balls[0]!,
      phase: "active",
      position: railPosition(0, base, 4.77),
      velocity: scale(unit(base), -24),
    },
  ];
  const before = state.players.map((p) => p.angle);
  before[0] = base - side * ARENA.paddleSpeed * FIXED_DT;
  const pieces = state.players.map((p) => p.pieces.map((body) => body.position));
  advanceBall(state, state.balls[0]!, before, FIXED_DT, DEFAULT_OPTIONS, pieces);
  const ball = state.balls[0]!;
  expect(state.events[0]!.type).toBe("paddle");
  expect(Math.sign(ball.spin ?? 0)).toBe(side);
  expect(Math.abs(ball.spin ?? 0)).toBeLessThanOrEqual(MAX_SWIPE_CURVE);
  expect(length(ball.velocity)).toBeCloseTo(24);
  expect(state.events[0]!.impact!.spin).toBe(ball.spin);
});

it("the dotted forecast samples the same curved incoming flight as the real solver", () => {
  const state = createMatch();
  state.phase = "playing";
  const base = fortress(0).direction;
  state.balls = [
    {
      ...state.balls[0]!,
      phase: "active",
      position: railPosition(0, base, 6),
      velocity: scale(unit(base), -24),
      spin: 0.2,
    },
  ];
  const predicted = predictReturn(state, 0, false)!;
  expect(predicted).not.toBeNull();
  const ball = structuredClone(state.balls[0]!);
  const trial = { ...structuredClone(state), balls: [ball], events: [] };
  const angles = trial.players.map((p) => p.angle),
    pieces = trial.players.map((p) => p.pieces.map((body) => body.position));
  let hit: ReturnType<typeof advanceBall>;
  for (let tick = 0; tick < 54 && !hit; tick++)
    hit = advanceBall(trial, ball, angles, FIXED_DT, DEFAULT_OPTIONS, pieces, true);
  expect(hit!.type).toBe("paddle");
  expect(predicted.contact.x).toBeCloseTo(hit!.position.x, 10);
  expect(predicted.contact.y).toBeCloseTo(hit!.position.y, 10);
  expect(angleDifference(angleOf(predicted.outgoing), angleOf(ball.velocity))).toBeCloseTo(0, 10);
  expect(ball.spin).toBe(0);
});
