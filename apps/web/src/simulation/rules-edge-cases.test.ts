import { expect, it } from "vite-plus/test";
import { ARENA, fortress } from "./arena";
import { createMatch, stepMatch } from "./match";
import { readyBall } from "./serving";
import { DEFAULT_OPTIONS, IDLE_INTENT } from "./types";
import { add, normalise, scale, sub } from "./vector";

function finalHit() {
  const state = createMatch(2026);
  state.phase = "playing";
  state.players[0]!.health = state.players[0]!.health.map((_, id) => id === 0);
  const body = state.players[0]!.pieces[0]!;
  const normal = normalise(sub(body.position, fortress(0).anchor));
  state.balls = [
    {
      ...state.balls[0]!,
      id: 0,
      phase: "active",
      position: add(body.position, scale(normal, 0.65)),
      velocity: scale(normal, -120),
      spin: 0,
    },
  ];
  return state;
}

it("finishes on the first stable-ID final hit and forbids any later same-tick serve", () => {
  const state = finalHit();
  state.players[2]!.health.fill(false);
  state.players[3]!.health.fill(false);
  const pending = readyBall(state, 1, 9);
  pending.age = 10;
  state.balls.unshift(pending);
  const result = stepMatch(state, { ...IDLE_INTENT, launch: true });
  expect(result.phase).toBe("finished");
  expect(result.winner).toBe(1);
  expect(result.balls).toEqual([]);
  expect(result.events.filter((e) => e.type === "victory")).toHaveLength(1);
  expect(result.events.some((e) => e.type === "launch")).toBe(false);
  expect(stepMatch(result, { ...IDLE_INTENT, launch: true })).toBe(result);
});

it("reassigns all pending serves after elimination and clears any old spin", () => {
  const state = finalHit();
  const pending = readyBall(state, 0, 1);
  pending.age = 10;
  pending.spin = 0.2;
  state.balls.push(pending);
  const result = stepMatch(state, IDLE_INTENT, DEFAULT_OPTIONS);
  expect(result.players[0]!.health.some(Boolean)).toBe(false);
  expect(result.balls.map((ball) => ball.id)).toEqual([0, 1]);
  for (const ball of result.balls) {
    expect(ball.phase).toBe("ready");
    expect(result.players[ball.seat]!.health.some(Boolean)).toBe(true);
    expect(ball.spin).toBe(0);
  }
  expect(result.events.some((e) => e.type === "launch")).toBe(false);
  expect(result.events.find((e) => e.type === "damage")!.returnTo).toBeDefined();
});

it("resolves mutual final hits by ball ID and stops before the later hit", () => {
  const state = createMatch(2026);
  state.phase = "playing";
  state.players.forEach((player) => {
    player.health = player.health.map((_, index) => player.id < 2 && index === 0);
  });
  state.players[0]!.pieces[0]!.position = { x: -1, y: 0 };
  state.players[1]!.pieces[0]!.position = { x: 1, y: 0 };
  state.balls = [9, 0].map((id) => ({
    ...state.balls[0]!,
    id,
    phase: "active",
    position: { x: id === 0 ? -1.6 : 1.6, y: 0 },
    velocity: { x: id === 0 ? 120 : -120, y: 0 },
    spin: 0,
  }));
  const result = stepMatch(state);
  expect(result.winner).toBe(1);
  expect(
    result.events.filter((event) => event.type === "damage").map((event) => event.seat),
  ).toEqual([0]);
  expect(result.players[1]!.health[0]).toBe(true);
  expect(result.balls).toEqual([]);
});

it("two same-tick balls cannot destroy the same isolated piece twice or substitute another piece", () => {
  const state = createMatch(1);
  state.phase = "playing";
  state.players[0]!.pieces[0]!.position = { x: 0, y: 0 };
  state.balls = [0, 1].map((id) => ({
    ...state.balls[0]!,
    id,
    phase: "active",
    position: { x: -0.6, y: 0 },
    velocity: { x: 120, y: 0 },
    spin: 0,
  }));
  const result = stepMatch(state);
  expect(result.stats.damage).toBe(1);
  expect(result.events.filter((e) => e.type === "damage" && e.piece === 0)).toHaveLength(1);
  expect(result.players[0]!.health.filter(Boolean)).toHaveLength(ARENA.startingPieces - 1);
  expect(result.balls[0]!.phase).toBe("ready");
  expect(result.balls[1]!.phase).toBe("active");
});
