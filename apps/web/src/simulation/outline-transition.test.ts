import { createMatch } from "./match";
import { damagePiece } from "./serving";
import { beginArenaMorph, stepArenaMorph } from "./arena-morph";
import { expect, it } from "vite-plus/test";
import { createArena, fortress, clampPaddleAngle, batCentre, ARENA } from "./arena";
import { matchOutlines, blendOutline } from "./outline-transition";
import { polygonEdges } from "./polygon";
import { add, scale, unit, dot, length, sub } from "./vector";
it("collapses a hexagon to a pentagon with at most six wall sections, with bounded monotone corner travel", () => {
  const from = createArena(6).vertices,
    to = createArena(5).vertices,
    outline = matchOutlines(from, to);
  expect(outline.from).toHaveLength(6);
  expect(outline.to).toHaveLength(6);
  for (let step = 0; step <= 100; step++) {
    const points = blendOutline(outline, step / 100);
    expect(points.length).toBeLessThanOrEqual(6);
    expect(points.length).toBeGreaterThanOrEqual(3);
    for (const edge of polygonEdges(points))
      for (const point of points)
        expect(dot(sub(point, edge.start), edge.normal)).toBeGreaterThanOrEqual(-1e-7);
  }
  expect(blendOutline(outline, 0)).toHaveLength(6);
  expect(blendOutline(outline, 1)).toHaveLength(5);
  for (const p of to)
    expect(Math.min(...blendOutline(outline, 1).map((q) => length(sub(p, q))))).toBeLessThan(1e-7);
});
it("retargets convex intermediate outlines directly to every smaller layout without adding temporary corners", () => {
  for (const source of [3, 4, 5, 6] as const)
    for (const target of [2, 3, 4, 5] as const) {
      if (target >= source) continue;
      const before = createArena(source),
        after = createArena(target, undefined, 0.2),
        outline = matchOutlines(before.vertices, after.vertices);
      const intermediate = blendOutline(outline, 0.4),
        again = matchOutlines(intermediate, createArena(2).vertices);
      for (let sample = 0; sample <= 20; sample++) {
        const points = blendOutline(again, sample / 20);
        expect(points.length).toBeLessThanOrEqual(Math.max(intermediate.length, 4));
        for (const edge of polygonEdges(points))
          for (const point of points)
            expect(dot(sub(point, edge.start), edge.normal)).toBeGreaterThanOrEqual(-1e-7);
      }
    }
});

it("keeps live bats inside the moving floor for every first elimination and rail extreme", () => {
  for (const count of [3, 4, 5, 6] as const)
    for (let dead = 0; dead < count; dead++) {
      const state = createMatch(4, count);
      state.phase = "playing";
      state.players[dead]!.health.fill(false);
      state.players[dead]!.health[0] = true;
      damagePiece(state, state.balls[0]!, dead, 0);
      beginArenaMorph(state);
      for (let sample = 0; sample < 30; sample++) {
        stepArenaMorph(state, 0.1);
        for (const player of state.players.filter((p) => p.id !== dead)) {
          const home = fortress(player.id, state.arena);
          for (const offset of [-2, 0, 2])
            for (const end of [-1, 0, 1]) {
              const angle = clampPaddleAngle(player.id, home.direction + offset, state.arena);
              const point = add(
                batCentre(player.id, angle, state.arena),
                scale(unit(angle + end * ARENA.batHalfAngle), ARENA.batRadius),
              );
              for (const edge of polygonEdges(state.arena.vertices))
                expect(
                  dot(sub(point, edge.start), edge.normal),
                  `${count} dead ${dead} sample ${sample} seat ${player.id} offset ${offset} end ${end}`,
                ).toBeGreaterThanOrEqual(ARENA.paddleThickness / 2 - 0.001);
            }
        }
      }
    }
});
