import { expect, it } from "vite-plus/test";
import { ARENA, batCentre, batHalfAngle, fortress, TRIANGLE_FORTRESS_INSET } from "./arena";
import { fitDefenceLimits } from "./defence-limits";
import { polygonEdges } from "./polygon";
import { add, dot, length, scale, sub, unit } from "./vector";
import { createMatch } from "./match";
import { levelDifficulty } from "./difficulty";
import { beginArenaMorph, stepArenaMorph } from "./arena-morph";
it.each([1, 50, 100])(
  "moves triangle fortresses inwards and increases usable bat travel at level %i without moving walls",
  (level) => {
    const state = createMatch(7, 3, 3, 7, levelDifficulty(level)),
      arena = state.arena;
    expect(arena.vertices).toHaveLength(3);
    for (const [index, home] of arena.fortresses.entries()) {
      const tip = arena.vertices[index]!;
      expect(length(tip)).toBeCloseTo(13);
      expect(length(home.anchor)).toBeCloseTo(13 - TRIANGLE_FORTRESS_INSET);
      expect(length(sub(home.anchor, tip))).toBeCloseTo(TRIANGLE_FORTRESS_INSET);
      const old = fitDefenceLimits({ ...arena, count: 4, fortresses: [{ ...home, anchor: tip }] });
      expect(home.angleLimits![1] - home.angleLimits![0]).toBeGreaterThan(
        (old.fortresses[0]!.angleLimits![1] - old.fortresses[0]!.angleLimits![0]) * 1.4,
      );
      for (const offset of home.angleLimits!)
        for (let sample = 0; sample <= 40; sample++) {
          const angle = home.direction + offset,
            point = add(
              batCentre(home.id, angle, arena),
              scale(
                unit(angle - batHalfAngle(arena) + (sample / 40) * batHalfAngle(arena) * 2),
                ARENA.batRadius,
              ),
            );
          for (const edge of polygonEdges(arena.vertices))
            expect(dot(sub(point, edge.start), edge.normal)).toBeGreaterThanOrEqual(
              ARENA.paddleThickness / 2 + 0.0149,
            );
        }
      for (const body of state.players[home.id]!.pieces)
        expect(length(sub(body.position, home.anchor)) + body.radius).toBeLessThan(
          ARENA.railRadius - ARENA.paddleThickness,
        );
    }
  },
);
it("lands a four-to-three elimination morph on the same inset layout, with surviving pieces inside", () => {
  const state = createMatch(7, 4);
  state.players[1]!.health.fill(false);
  state.eliminations.push({ seat: 1, elapsed: 0 });
  beginArenaMorph(state);
  while (state.morph) stepArenaMorph(state, 1 / 120);
  expect(state.arena.count).toBe(3);
  for (const p of state.players.filter((p) => p.health.some(Boolean))) {
    expect(length(fortress(p.id, state.arena).anchor)).toBeCloseTo(13 - TRIANGLE_FORTRESS_INSET);
    for (const b of p.pieces)
      for (const edge of polygonEdges(state.arena.vertices))
        expect(dot(sub(b.position, edge.start), edge.normal)).toBeGreaterThanOrEqual(b.radius);
  }
});
