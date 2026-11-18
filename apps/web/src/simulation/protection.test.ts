import { expect, it } from "vite-plus/test";
import { ARENA, FIXED_DT, fortress } from "./arena";
import { advanceBalls } from "./balls";
import { createMatch, stepMatch } from "./match";
import { collectSupply } from "./supplies";
import { damagePiece } from "./serving";
import { containersProtected, CONTAINER_PROTECTION_SECONDS } from "./protection";
import { DEFAULT_OPTIONS, type MatchState } from "./types";
import { add, dot, scale, unit } from "./vector";

function fixture(seat = 0) {
  const state = createMatch(2026, 4);
  state.phase = "playing";
  state.elapsed = 10;
  const normal = unit(fortress(seat, state.arena).direction);
  const shot = (piece: number, id: number, gap = 0.01) => ({
    ...state.balls[0]!,
    id,
    phase: "active" as const,
    striker: (seat + 1) % 4,
    position: add(
      state.players[seat]!.pieces[piece]!.position,
      scale(normal, ARENA.ballRadius + state.players[seat]!.pieces[piece]!.radius + gap),
    ),
    velocity: scale(normal, -24),
  });
  return { state, normal, shot };
}
function advance(state: MatchState, dt = FIXED_DT) {
  state.elapsed += dt;
  advanceBalls(
    state,
    state.balls,
    state.players.map((p) => p.angle),
    dt,
    DEFAULT_OPTIONS,
    state.players.map((p) => p.pieces.map((b) => b.position)),
  );
}

it.each([0, 1, 2, 3])(
  "protects all remaining containers for two playing seconds after seat %i loses health",
  (seat) => {
    const { state } = fixture(seat);
    damagePiece(state, state.balls[0]!, seat, 0);
    const player = state.players[seat]!;
    expect(player.protectedUntil).toBe(10 + CONTAINER_PROTECTION_SECONDS);
    expect(containersProtected(player, 10)).toBe(true);
    expect(containersProtected(player, 12 - 1e-6)).toBe(true);
    expect(containersProtected(player, 12)).toBe(false);
    for (const other of state.players.filter((p) => p.id !== seat))
      expect(containersProtected(other, 10)).toBe(false);
    damagePiece(state, state.balls[0]!, seat, 1);
    expect(player.health.filter(Boolean)).toHaveLength(2);
    expect(state.stats.damage).toBe(1);
    state.elapsed = 12;
    damagePiece(state, state.balls[0]!, seat, 1);
    expect(player.health.filter(Boolean)).toHaveLength(1);
    expect(player.protectedUntil).toBe(14);
  },
);

it("starts protection at the swept hit time, rebounds simultaneous hits and leaves revenge serve allocation intact", () => {
  const { state, shot, normal } = fixture();
  state.balls = [shot(0, 0), shot(1, 1)];
  state.balls.forEach((ball) => {
    ball.rallyTime = 12;
  });
  advance(state);
  expect(state.stats.damage).toBe(1);
  expect(state.players[0]!.health.filter(Boolean)).toHaveLength(2);
  const damage = state.events.find((e) => e.type === "damage")!,
    shield = state.events.find((e) => e.type === "shield")!;
  expect(damage).toBeDefined();
  expect(shield).toBeDefined();
  expect(state.players[0]!.protectedUntil).toBeCloseTo(10 + damage.impact!.time + 2, 10);
  const ready = state.balls.find((b) => b.phase === "ready")!,
    active = state.balls.find((b) => b.phase === "active")!;
  expect(ready.seat).toBe(0);
  expect(dot(active.velocity, normal)).toBeGreaterThan(0);
  expect(active.striker).toBe(1);
  expect(active.rallyTime).toBe(12);
  expect(ready.rallyTime).toBe(0);
  expect(state.stats.collisionCaps).toBe(0);
});

it("does not extend protection on a bounce and still damages another unprotected defender", () => {
  const { state, shot } = fixture();
  damagePiece(state, state.balls[0]!, 0, 0);
  const until = state.players[0]!.protectedUntil;
  state.balls = [shot(1, 1)];
  advance(state);
  expect(state.events.filter((e) => e.type === "shield")).toHaveLength(1);
  expect(state.players[0]!.protectedUntil).toBe(until);
  damagePiece(state, state.balls[0]!, 1, 0);
  expect(state.stats.damage).toBe(2);
  expect(containersProtected(state.players[1]!, state.elapsed)).toBe(true);
});

it.each([
  [-0.001, "shield"],
  [0, "damage"],
  [0.001, "damage"],
] as const)("checks the actual impact time across expiry offset %s", (offset, event) => {
  const { state, shot } = fixture();
  state.players[0]!.protectedUntil = 10;
  const travel = 0.003;
  state.elapsed = 10 + offset - travel;
  state.balls = [shot(0, 0, 24 * travel)];
  advance(state);
  expect(state.events[0]!.type).toBe(event);
  expect(state.stats.collisionCaps).toBe(0);
});

it("does not protect an eliminated seat and resets protection with a new match", () => {
  const { state } = fixture();
  state.players[0]!.health = [true, false, false];
  damagePiece(state, state.balls[0]!, 0, 0);
  expect(containersProtected(state.players[0]!, state.elapsed)).toBe(false);
  expect(state.balls[0]!.seat).not.toBe(0);
  expect(createMatch(2026).players.every((p) => p.protectedUntil === undefined)).toBe(true);
});

it("does not consume protection during countdown or mutate the previous match state", () => {
  const { state } = fixture();
  damagePiece(state, state.balls[0]!, 0, 0);
  state.phase = "countdown";
  const saved = structuredClone(state);
  const next = stepMatch(state);
  expect(state).toEqual(saved);
  expect(next.elapsed).toBe(state.elapsed);
  expect(next.players[0]!.protectedUntil).toBe(state.players[0]!.protectedUntil);
});

it("keeps legacy/fresh players without a protection deadline vulnerable in isolated solver fixtures", () => {
  const player = createMatch().players[0]!;
  for (const at of [-FIXED_DT, 0, 10]) expect(containersProtected(player, at)).toBe(false);
});

it("covers a collected replacement container without extending the deadline", () => {
  const { state, shot } = fixture();
  damagePiece(state, state.balls[0]!, 0, 0);
  const until = state.players[0]!.protectedUntil;
  state.supplies = [{ id: 0, age: 2, position: { x: 0, y: 0 } }];
  state.balls[0]!.striker = 0;
  expect(collectSupply(state, state.balls[0]!, 0)).toBeTruthy();
  expect(state.players[0]!.health[0]).toBe(true);
  state.balls = [shot(0, 1)];
  advance(state);
  expect(state.stats.damage).toBe(1);
  expect(state.players[0]!.protectedUntil).toBe(until);
  expect(state.events.some((e) => e.type === "shield")).toBe(true);
});
