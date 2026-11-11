import { expect, it } from "vite-plus/test";
import { createRoundObserver } from "./round-observer";
import type { GameEvent } from "../simulation/types";
const e = (id: number, type: GameEvent["type"], seat: number, ballId = 0): GameEvent => ({
  id,
  tick: id,
  type,
  seat,
  ballId,
  piece: null,
  position: { x: 0, y: 0 },
});
it("credits the last real return across walls, with independent multiball ownership", () => {
  const observer = createRoundObserver(6),
    events = [
      e(0, "launch", 1),
      e(1, "paddle", 0),
      e(2, "wall", -1),
      e(3, "launch", 4, 1),
      e(4, "damage", 2),
      e(5, "damage", 5, 1),
    ];
  const before = structuredClone(events),
    result = observer.observe(events, 2);
  expect(result[4]!.attackerSeat).toBe(0);
  expect(result[5]!.attackerSeat).toBe(4);
  expect(observer.snapshot()).toMatchObject({
    peakBalls: 2,
    players: [
      { returns: 1, scored: 1 },
      { scored: 0 },
      { lost: 1 },
      { scored: 0 },
      { scored: 1 },
      { lost: 1 },
    ],
  });
  expect(events).toEqual(before);
  expect(observer.owners().get(0)).toBe(0);
  expect(observer.owners().get(1)).toBe(4);
  (observer.owners() as Map<number, number>).set(0, 5);
  expect(observer.owners().get(0)).toBe(0);
  expect(observer.observe(events)).toEqual([]);
});
it("resets credit on revenge launch and distinguishes self hits, unknown credit and eliminating hits", () => {
  const observer = createRoundObserver(3);
  const result = observer.observe([
    e(0, "damage", 1),
    e(1, "launch", 0),
    e(2, "damage", 1),
    e(3, "launch", 1),
    e(4, "damage", 1),
    e(5, "paddle", 2),
    e(6, "damage", 0),
    e(7, "elimination", 0),
  ]);
  expect(result[0]!.attackerSeat).toBeNull();
  expect(result[4]!.attackerSeat).toBe(1);
  expect(result[6]!.attackerSeat).toBe(2);
  expect(observer.snapshot().players.map((p) => [p.scored, p.eliminations])).toEqual([
    [1, 0],
    [0, 0],
    [1, 1],
  ]);
  const snapshot = observer.snapshot();
  snapshot.players[0]!.scored = 100;
  expect(observer.snapshot().players[0]!.scored).toBe(1);
});
