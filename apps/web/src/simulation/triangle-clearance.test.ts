import { expect, it } from "vite-plus/test";
import {
  ARENA,
  batCentre,
  batHalfAngle,
  fortress,
  TRIANGLE_FORTRESS_INSET,
  TRIANGLE_BAT_WALL_GAP,
} from "./arena";
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
      const old = fitDefenceLimits({
        ...arena,
        count: 4,
        batWallGap: 0.015,
        fortresses: [{ ...home, anchor: tip }],
      });
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
              ARENA.paddleThickness / 2 + TRIANGLE_BAT_WALL_GAP - 1e-6,
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
it.each([1, 50, 100])(
  "leaves a genuine ball corridor beside every triangle bat at level %i",
  async (level) => {
    const { sweepPaddle, sweepWalls } = await import("./collision");
    const arena = createMatch(7, 3, 3, 7, levelDifficulty(level)).arena,
      edges = polygonEdges(arena.vertices);
    expect(TRIANGLE_BAT_WALL_GAP).toBeGreaterThan(ARENA.ballRadius * 2 + 0.2);
    for (const home of arena.fortresses)
      for (const offset of home.angleLimits!) {
        const angle = home.direction + offset;
        // Find the bat surface closest to a side wall, then send a real circle along that lane.
        const candidates = edges
          .flatMap((edge) =>
            [-1, 1].map((side) => {
              const point = add(
                batCentre(home.id, angle, arena),
                scale(unit(angle + side * batHalfAngle(arena)), ARENA.batRadius),
              );
              return { edge, point, distance: dot(sub(point, edge.start), edge.normal) };
            }),
          )
          .sort((a, b) => a.distance - b.distance);
        const { edge, point, distance } = candidates[0]!;
        const centre = add(point, scale(edge.normal, ARENA.ballRadius + 0.04 - distance));
        const tangent = scale(sub(edge.end, edge.start), 1 / length(sub(edge.end, edge.start)));
        const start = add(centre, scale(tangent, -0.5)),
          velocity = scale(tangent, 12);
        expect(sweepPaddle(start, velocity, home.id, angle, 0, 1 / 12, arena)).toBeNull();
        expect(sweepWalls(start, velocity, 1 / 12, arena)).toHaveLength(0);
      }
  },
);
it("interpolates the requested gap through a four-to-three morph rather than snapping it", () => {
  const state = createMatch(7, 4);
  state.players[1]!.health.fill(false);
  state.eliminations.push({ seat: 1, elapsed: 0 });
  beginArenaMorph(state);
  let previous = 0.015;
  while (state.morph) {
    stepArenaMorph(state, 1 / 120);
    const gap = state.arena.batWallGap ?? 0.015;
    expect(gap).toBeGreaterThanOrEqual(previous - 1e-9);
    expect(gap - previous).toBeLessThan(0.005);
    previous = gap;
  }
  expect(previous).toBeCloseTo(TRIANGLE_BAT_WALL_GAP);
});
