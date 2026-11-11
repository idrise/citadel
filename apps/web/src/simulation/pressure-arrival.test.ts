import { expect, it } from "vite-plus/test";
import { fortress, railPosition } from "./arena";
import { createMatch } from "./match";
import { pressureArrival } from "./pressure-arrival";
import { length, scale, sub, unit } from "./vector";
import { MAX_SWIPE_CURVE } from "./flight";

function incoming() {
  const state = createMatch(2026);
  const angle = fortress(0).direction;
  const ball = state.balls[0]!;
  ball.phase = "active";
  ball.position = railPosition(0, angle, 7);
  ball.velocity = scale(unit(angle), -24);
  return { state, ball };
}

it("uses a curved arrival point for pressure relief without mutating the match", () => {
  const { state, ball } = incoming();
  const straight = pressureArrival(state, ball, 0, 0.45)!;
  ball.spin = MAX_SWIPE_CURVE;
  const before = structuredClone(state);
  const curved = pressureArrival(state, ball, 0, 0.45)!;
  expect(curved.time).toBeCloseTo(straight.time, 2);
  expect(length(sub(curved.point, straight.point))).toBeGreaterThan(0.12);
  expect(length(sub(curved.point, fortress(0).anchor))).toBeCloseTo(4.8, 8);
  expect(state).toEqual(before);
});

it("rejects a curved arrival intercepted by a live piece and restores it through a real gap", () => {
  const { state, ball } = incoming();
  ball.spin = MAX_SWIPE_CURVE;
  const blocker = state.players[1]!.pieces[0]!;
  blocker.position = railPosition(0, fortress(0).direction, 6);
  expect(pressureArrival(state, ball, 0, 0.45)).toBeNull();
  state.players[1]!.health[0] = false;
  expect(pressureArrival(state, ball, 0, 0.45)).not.toBeNull();
  expect(pressureArrival(state, ball, 0, 0.02)).toBeNull();
});

it("keeps a curved approach whose initial straight ray misses the defence", () => {
  const { state, ball } = incoming();
  const anchor = fortress(0).anchor;
  ball.position = { x: anchor.x + 7, y: anchor.y - 5.1 };
  ball.velocity = { x: -24, y: 0 };
  expect(pressureArrival(state, ball, 0, 0.45)).toBeNull();
  ball.spin = -MAX_SWIPE_CURVE;
  expect(pressureArrival(state, ball, 0, 0.45)).not.toBeNull();
});
