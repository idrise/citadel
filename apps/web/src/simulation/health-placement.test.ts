import { expect, it } from "vite-plus/test";
import { createMatch } from "./match";
import { collectSupply, stepSupplies } from "./supplies";
import { stepHealth } from "./health";
import { FIXED_DT } from "./arena";
import { length, sub } from "./vector";

it.each([2, 3, 4, 5, 6] as const)(
  "adds seven containers to every %i-seat fortress without spawning or settling through an existing body",
  (count) => {
    for (let seat = 0; seat < count; seat++) {
      const state = createMatch(7, count),
        player = state.players[seat]!;
      state.phase = "playing";
      state.balls[0]!.striker = seat;
      for (let added = 0; added < 7; added++) {
        const before = player.pieces.map((piece) => ({ ...piece.position }));
        state.supplies = [{ id: added, age: 1, position: { x: 0, y: 0 } }];
        expect(collectSupply(state, state.balls[0]!, added)).toBeTruthy();
        expect(player.pieces.slice(0, before.length).map((piece) => piece.position)).toEqual(
          before,
        );
        for (let tick = 0; tick < 100; tick++) {
          for (let i = 0; i < player.pieces.length; i++)
            for (let j = i + 1; j < player.pieces.length; j++) {
              const a = player.pieces[i]!,
                b = player.pieces[j]!;
              expect(length(sub(a.position, b.position))).toBeGreaterThanOrEqual(
                a.radius + b.radius + 0.01,
              );
            }
          stepHealth(player, FIXED_DT, state.arena);
        }
      }
      expect(player.health.filter(Boolean)).toHaveLength(10);
    }
  },
);
it("varies pickup sites independently of bot randomness and reproduces an explicit supply seed", () => {
  const a = createMatch(2026, 4, 3, 11),
    b = createMatch(2026, 4, 3, 999),
    replay = createMatch(2026, 4, 3, 11);
  for (const state of [a, b, replay]) {
    state.phase = "playing";
    state.elapsed = 4;
  }
  const before = a.rng;
  for (const state of [a, b, replay]) stepSupplies(state, FIXED_DT);
  expect(a.rng).toBe(before);
  expect(a.supplies).toEqual(replay.supplies);
  expect(length(sub(a.supplies[0]!.position, b.supplies[0]!.position))).toBeGreaterThan(1);
  let previous = a.supplies[0]!.position;
  for (let elapsed = 12; elapsed < 60; elapsed += 8) {
    a.elapsed = elapsed;
    a.supplies = [];
    stepSupplies(a, FIXED_DT);
    expect(length(sub(a.supplies[0]!.position, previous))).toBeGreaterThanOrEqual(2);
    previous = a.supplies[0]!.position;
  }
});
