import { expect, it } from "vite-plus/test";
import { ARENA, FIXED_DT, FORTRESSES } from "./arena";
import { createMatch } from "./match";
import { stepHealth } from "./health";
import { HEALTH_GROWTH_PER_LOSS, HEALTH_MAX_SCALE } from "./health-layout";
import { advanceBall } from "./ball";
import { DEFAULT_OPTIONS } from "./types";
import { length, sub } from "./vector";

it("starts with separated, compact physical targets behind each defence arc", () => {
  for (const player of createMatch().players) {
    const seat = FORTRESSES[player.id]!;
    for (const [index, body] of player.pieces.entries()) {
      expect(length(sub(body.position, seat.anchor)) + body.radius).toBeLessThan(
        ARENA.railRadius - 0.5,
      );
      for (const other of player.pieces.slice(index + 1))
        expect(length(sub(body.position, other.position))).toBeGreaterThan(
          body.radius + other.radius + 0.08,
        );
    }
  }
});

it.each([1, 2, 3, 4, 5, 6, 7])(
  "%s survivors grow modestly and settle together without escaping or overlapping",
  (count) => {
    const player = createMatch(1, 4, 8).players[0]!;
    player.health = player.health.map((_, index) => index < count);
    const before = structuredClone(player.pieces[0]!.position);
    for (let tick = 0; tick < 300; tick++) stepHealth(player, FIXED_DT);
    const expectedRadius = ARENA.pieceRadius * (1 + (8 - count) * HEALTH_GROWTH_PER_LOSS);
    for (let index = 0; index < count; index++) {
      const body = player.pieces[index]!;
      expect(body.radius).toBeCloseTo(expectedRadius, 5);
      expect(body.radius).toBeLessThanOrEqual(ARENA.pieceRadius * HEALTH_MAX_SCALE);
      expect(length(body.velocity)).toBeLessThan(0.02);
      expect(Math.abs(body.position.x) + body.radius).toBeLessThan(ARENA.halfSize);
      expect(Math.abs(body.position.y) + body.radius).toBeLessThan(ARENA.halfSize);
      expect(length(sub(body.position, FORTRESSES[0]!.anchor)) + body.radius).toBeLessThan(
        ARENA.railRadius - 0.4,
      );
      for (const other of player.pieces.slice(index + 1, count))
        expect(length(sub(body.position, other.position))).toBeGreaterThan(
          body.radius + other.radius - 0.02,
        );
    }
    expect(length(sub(player.pieces[0]!.position, before))).toBeGreaterThan(0.02);
  },
);

it("growth and clustering are deterministic and incremental rather than an instant teleport", () => {
  const first = createMatch(1).players[0]!;
  first.health[1] = false;
  const second = structuredClone(first);
  const before = structuredClone(first.pieces[0]!);
  stepHealth(first, FIXED_DT);
  expect(length(sub(first.pieces[0]!.position, before.position))).toBeLessThan(0.03);
  expect(first.pieces[0]!.radius).toBeGreaterThan(before.radius);
  expect(first.pieces[0]!.radius).toBeLessThan(before.radius * 1.035);
  stepHealth(second, FIXED_DT);
  expect(first).toEqual(second);
});

it("sweeps against a moving target instead of only checking its final position", () => {
  const state = createMatch(8);
  state.phase = "playing";
  state.players[0]!.health = state.players[0]!.health.map((_, index) => index === 0);
  const previous = state.players.map((player) =>
    player.pieces.map((piece) => ({ ...piece.position })),
  );
  previous[0]![0] = { x: 0.1, y: -0.8 };
  state.players[0]!.pieces[0]!.position = { x: 0.1, y: 0.8 };
  state.balls[0] = {
    id: 0,
    phase: "active",
    seat: 1,
    age: 0,
    position: { x: 0, y: 0 },
    velocity: { x: 24, y: 0 },
    slowSeat: null,
  };
  advanceBall(
    state,
    state.balls[0]!,
    state.players.map((player) => player.angle),
    FIXED_DT,
    DEFAULT_OPTIONS,
    previous,
  );
  expect(state.stats.damage).toBe(1);
  expect(state.players[0]!.health[0]).toBe(false);
});
