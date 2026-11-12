import { expect, it } from "vite-plus/test";
import { createMatch } from "../simulation/match";
import { createTitleTransition, TITLE_TRANSITION_SECONDS } from "./title-transition";
import type { PlayerCount } from "../simulation/arena";
import { length, sub } from "../simulation/vector";

it("morphs every pair of title layouts with continuous actor poses, then returns the exact target state", () => {
  for (const from of [2, 3, 4, 5, 6] as PlayerCount[])
    for (const to of [2, 3, 4, 5, 6] as PlayerCount[]) {
      const a = createMatch(2026, from),
        b = createMatch(2026, to),
        savedA = structuredClone(a),
        savedB = structuredClone(b);
      const transition = createTitleTransition();
      transition.update(a, from - 1, 0, false);
      transition.begin(b, to - 1, true);
      const start = transition.update(b, to - 1, 0, false);
      for (const player of a.players) {
        expect(start.state.players[player.id]!.pieces.map((p) => p.position)).toEqual(
          player.pieces.map((p) => p.position),
        );
        expect(start.scales[player.id]).toBe(1);
      }
      const middle = transition.update(b, to - 1, TITLE_TRANSITION_SECONDS / 2, false);
      expect(middle.moving).toBe(true);
      expect(
        middle.state.arena.vertices.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y)),
      ).toBe(true);
      if (to > from) expect(middle.scales[to - 1]).toBeCloseTo(0.5);
      if (from > to) expect(middle.scales[from - 1]).toBeCloseTo(0.5);
      const end = transition.update(b, to - 1, TITLE_TRANSITION_SECONDS, false);
      expect(end.moving).toBe(false);
      expect(end.state).toBe(b);
      expect(a).toEqual(savedA);
      expect(b).toEqual(savedB);
    }
});
it("retargets from the visible intermediate shape, pauses without moving, and respects reduced motion", () => {
  const transition = createTitleTransition(),
    a = createMatch(5, 2),
    b = createMatch(5, 6),
    c = createMatch(5, 3);
  transition.update(a, 0, 0, false);
  transition.begin(b, 0, true);
  const halfway = transition.update(b, 0, 0.4, false);
  const positions = halfway.state.players[0]!.pieces.map((p) => p.position);
  expect(transition.update(b, 0, 0, false).state.arena.vertices).toEqual(
    halfway.state.arena.vertices,
  );
  transition.begin(c, 0, true);
  const retarget = transition.update(c, 0, 0, false);
  expect(retarget.state.players[0]!.pieces.map((p) => p.position)).toEqual(positions);
  for (const p of halfway.state.arena.vertices)
    expect(Math.min(...retarget.state.arena.vertices.map((q) => length(sub(p, q))))).toBeLessThan(
      1e-6,
    );
  expect(transition.update(c, 0, 0, true).state).toBe(c);
});
