import { expect, it } from "vite-plus/test";
import { ARENA, FIXED_DT, fortress, railPosition } from "./arena";
import { createMatch, stepMatch } from "./match";
import { advanceBall } from "./ball";
import { approachSlowdown, APPROACH_SPEED_FACTOR } from "./slowdown";
import { DEFAULT_OPTIONS, IDLE_INTENT } from "./types";
import { length, scale, unit } from "./vector";

it.each([0, 1, 2, 3])(
  "uses the same bounded non-stacking slowdown and hysteresis for seat %s",
  (seat) => {
    const state = createMatch(2),
      ball = state.balls[0]!;
    state.phase = "playing";
    const angle = fortress(seat).direction;
    ball.phase = "active";
    ball.position = railPosition(seat, angle, 6.4);
    ball.velocity = scale(unit(angle), -24);
    const before = structuredClone(state);
    expect(approachSlowdown(state, ball, true)).toEqual({ seat, factor: APPROACH_SPEED_FACTOR });
    expect(state).toEqual(before);
    ball.slowSeat = seat;
    ball.position = railPosition(seat, angle, 6.7);
    expect(approachSlowdown(state, ball, true).seat).toBe(seat);
    ball.slowSeat = null;
    expect(approachSlowdown(state, ball, true).factor).toBe(1);
    ball.slowSeat = seat;
    ball.position = railPosition(seat, angle, 7.1);
    expect(approachSlowdown(state, ball, true).factor).toBe(1);
    ball.position = railPosition(seat, angle, 6);
    expect(approachSlowdown(state, ball, false).factor).toBe(1);
    ball.velocity = scale(ball.velocity, -1);
    expect(approachSlowdown(state, ball, true).factor).toBe(1);
    ball.velocity = scale(ball.velocity, -1);
    state.players[seat]!.health.fill(false);
    expect(approachSlowdown(state, ball, true).factor).toBe(1);
  },
);

it("restores full stored speed immediately after a paddle hit and when the experiment is disabled", () => {
  const state = createMatch(2);
  state.phase = "playing";
  const ball = state.balls[0]!;
  ball.phase = "active";
  ball.position = railPosition(0, fortress(0).direction, 4.74);
  ball.velocity = scale(unit(fortress(0).direction), -24);
  ball.slowSeat = 0;
  const angles = state.players.map((p) => p.angle),
    pieces = state.players.map((p) => p.pieces.map((body) => body.position));
  advanceBall(state, ball, angles, FIXED_DT, { ...DEFAULT_OPTIONS, slowdown: true }, pieces);
  expect(state.events[0]!.type).toBe("paddle");
  expect(ball.slowSeat).toBeNull();
  expect(length(ball.velocity)).toBeCloseTo(24);
  ball.position = railPosition(0, fortress(0).direction, 6);
  ball.velocity = scale(unit(fortress(0).direction), -24);
  ball.slowSeat = 0;
  advanceBall(state, ball, angles, FIXED_DT, DEFAULT_OPTIONS, pieces);
  expect(ball.slowSeat).toBeNull();
  expect(length(ball.velocity)).toBeCloseTo(24);
});

it.each([0, 1, 2, 3])(
  "keeps mouse/keyboard speed caps, rail limits and exact stopping identical for seat %s",
  (seat) => {
    let mouse = createMatch(2),
      keyboard = createMatch(2);
    mouse.countdown = keyboard.countdown = 1000;
    const options = { ...DEFAULT_OPTIONS, humanSeat: seat };
    const start = fortress(seat).direction;
    mouse = stepMatch(mouse, { ...IDLE_INTENT, targetAngle: start + 0.45 }, options);
    keyboard = stepMatch(keyboard, { ...IDLE_INTENT, steer: 1 }, options);
    expect(mouse.players[seat]!.angle).toBeCloseTo(keyboard.players[seat]!.angle);
    expect(mouse.players[seat]!.angle - start).toBeCloseTo(ARENA.paddleSpeed * FIXED_DT);
    const target = start + 0.123;
    for (let tick = 0; tick < 120; tick++) {
      const before = mouse.players[seat]!.angle;
      mouse = stepMatch(mouse, { ...IDLE_INTENT, targetAngle: target }, options);
      expect(Math.abs(mouse.players[seat]!.angle - before)).toBeLessThanOrEqual(
        ARENA.paddleSpeed * FIXED_DT + 1e-10,
      );
    }
    expect(mouse.players[seat]!.angle).toBeCloseTo(target, 10);
  },
);
