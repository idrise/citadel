import { expect, it } from "vite-plus/test";
import { damagePiece } from "./serving";
import { beginArenaMorph, stepArenaMorph } from "./arena-morph";
import { createMatch, stepMatch } from "./match";
import { collectSupply, stepSupplies, SUPPLIES } from "./supplies";
import { ARENA, FIXED_DT } from "./arena";
import { advanceBall } from "./ball";
import { DEFAULT_OPTIONS } from "./types";
import { polygonEdges } from "./polygon";
import { dot, sub } from "./vector";

it.each([2, 3, 4, 5, 6] as const)(
  "starts %i-seat matches with exactly three normal-sized physical containers",
  (count) => {
    const state = createMatch(42, count);
    for (const player of state.players) {
      expect(player.health).toEqual([true, true, true]);
      expect(player.pieces).toHaveLength(3);
      expect(player.pieces.every((piece) => piece.radius === ARENA.pieceRadius)).toBe(true);
    }
  },
);
it("uses the playing clock, deterministic contained drops, and a hard cutoff with no late catch-up", () => {
  const state = createMatch(14, 3),
    replay = createMatch(14, 3);
  stepSupplies(state, 10);
  expect(state.supplies).toEqual([]);
  state.phase = replay.phase = "playing";
  for (let tick = 0; tick < 60 * 120; tick++) {
    state.elapsed = replay.elapsed = tick * FIXED_DT;
    stepSupplies(state, FIXED_DT);
    stepSupplies(replay, FIXED_DT);
    expect(state.supplies.length).toBeLessThanOrEqual(2);
    for (const drop of state.supplies)
      for (const edge of polygonEdges(state.arena.vertices))
        expect(dot(sub(drop.position, edge.start), edge.normal)).toBeGreaterThan(SUPPLIES.radius);
  }
  expect(state).toEqual(replay);
  expect(state.nextSupplyId).toBe(7);
  state.elapsed = 100;
  state.nextSupplyId = 0;
  state.supplies = [];
  stepSupplies(state, 1);
  expect(state.supplies).toEqual([]);
});
function collectable() {
  const state = createMatch(3, 4);
  state.phase = "playing";
  state.supplies = [{ id: 0, position: { x: 0, y: 0 }, age: 1 }];
  Object.assign(state.balls[0]!, {
    phase: "active",
    seat: 1,
    striker: 2,
    position: { x: -1, y: 0 },
    velocity: { x: 240, y: 0 },
  });
  return state;
}
it("sweeps fast shots through a container, credits the last striker and continues the ball unchanged", () => {
  const state = collectable(),
    before = structuredClone(state);
  const next = stepMatch(state);
  expect(state).toEqual(before);
  expect(next.supplies).toHaveLength(0);
  expect(next.players[2]!.health.filter(Boolean)).toHaveLength(4);
  expect(next.players[1]!.health.filter(Boolean)).toHaveLength(3);
  expect(next.balls[0]!.phase).toBe("active");
  expect(next.balls[0]!.velocity).toEqual(state.balls[0]!.velocity);
  expect(next.events.filter((e) => e.type === "collection")).toHaveLength(1);
  expect(next.stats.damage).toBe(0);
});
it("cannot collect during descent or resurrect an eliminated striker", () => {
  const state = collectable();
  state.supplies[0]!.age = 0.5;
  expect(collectSupply(state, state.balls[0]!, 0)).toBe(false);
  state.supplies[0]!.age = 1;
  state.players[2]!.health.fill(false);
  expect(collectSupply(state, state.balls[0]!, 0)).toBe(false);
  expect(state.supplies).toHaveLength(1);
});
it("reuses a broken piece slot and handles a second same-tick ball without duplicate collection or phantom moving pieces", () => {
  const state = collectable();
  state.players[2]!.health[0] = false;
  state.balls.push({ ...structuredClone(state.balls[0]!), id: 1 });
  const next = stepMatch(state);
  expect(next.players[2]!.health).toEqual([true, true, true]);
  expect(next.players[2]!.pieces).toHaveLength(3);
  expect(next.events.filter((e) => e.type === "collection")).toHaveLength(1);
  expect(next.balls).toHaveLength(2);
  expect(next.stats.damage).toBe(0);
});
it("keeps query forecasts read-only and clears resources when the round finishes", () => {
  const state = collectable(),
    saved = structuredClone(state);
  const trial = structuredClone(state);
  const hit = advanceBall(
    trial,
    trial.balls[0]!,
    trial.players.map((p) => p.angle),
    FIXED_DT,
    DEFAULT_OPTIONS,
    trial.players.map((p) => p.pieces.map((b) => b.position)),
    true,
  );
  expect(hit).toBeUndefined();
  expect(trial.supplies).toEqual(saved.supplies);
  expect(trial.players).toEqual(saved.players);
  expect(state).toEqual(saved);
  state.players[2]!.health.fill(false);
  state.players[3]!.health.fill(false);
  state.players[1]!.health = [true, false, false];
  damagePiece(state, state.balls[0]!, 1, 0);
  expect(state.phase).toBe("finished");
  expect(state.supplies).toEqual([]);
  expect(collectSupply(state, saved.balls[0]!, 0)).toBe(false);
});

it("preserves last-paddle ownership through a real wall rebound before collection", () => {
  const state = collectable();
  state.balls[0]!.position = { x: 8, y: 0 };
  state.balls[0]!.velocity = { x: 24, y: 0 };
  state.supplies[0]!.position = { x: 5, y: 0 };
  advanceBall(
    state,
    state.balls[0]!,
    state.players.map((p) => p.angle),
    0.4,
    DEFAULT_OPTIONS,
    state.players.map((p) => p.pieces.map((b) => b.position)),
  );
  expect(state.events.map((e) => e.type)).toEqual(["wall", "collection"]);
  expect(state.events[1]!.seat).toBe(2);
  expect(state.balls[0]!.striker).toBe(2);
});
it("carries landed and falling supplies safely with an elimination morph", () => {
  const state = createMatch(2026, 6);
  state.phase = "playing";
  state.supplies = [
    { id: 0, position: { x: 5, y: -5 }, age: 0.4 },
    { id: 1, position: { x: -5, y: 5 }, age: 2 },
  ];
  state.players[4]!.health.fill(false);
  state.eliminations.push({ seat: 4, elapsed: 0 });
  beginArenaMorph(state);
  for (let i = 0; i < 10; i++) {
    stepArenaMorph(state, 0.4);
    for (const drop of state.supplies)
      for (const edge of polygonEdges(state.arena.vertices))
        expect(dot(sub(drop.position, edge.start), edge.normal)).toBeGreaterThanOrEqual(
          SUPPLIES.radius,
        );
  }
  expect(state.supplies.map((drop) => drop.age)).toEqual([0.4, 2]);
});
