import { expect, it } from "vite-plus/test";
import { createMatch } from "./match";
import { standings } from "./standings";
import { damagePiece } from "./serving";
it("ranks stable seat IDs by elimination order and gives the last survivor first place", () => {
  const state = createMatch(4, 3);
  state.phase = "playing";
  for (const id of [1, 0]) {
    state.players[id]!.health.fill(false);
    state.players[id]!.health[7] = true;
    state.elapsed += 10;
    damagePiece(state, state.balls[0]!, id, 7);
  }
  expect(standings(state).map((p) => [p.seat, p.place, p.health])).toEqual([
    [2, 1, 8],
    [0, 2, 0],
    [1, 3, 0],
  ]);
  expect(state.eliminations).toEqual([
    { seat: 1, elapsed: 10 },
    { seat: 0, elapsed: 20 },
  ]);
});
it("leaves living places undecided during play, independent of colour or array order", () => {
  const state = createMatch(2, 6);
  state.players[0]!.health[0] = false;
  const rows = standings(state);
  expect(rows.every((row) => row.place === null)).toBe(true);
  expect(rows.at(-1)!.seat).toBe(0);
});
