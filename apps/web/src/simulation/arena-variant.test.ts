import { expect, it } from "vite-plus/test";
import { arenaVariant, levelArenaShape, type ArenaShape } from "./arena-variant";
import { ARENA, batCentre, batHalfAngle, createArena } from "./arena";
import { polygonEdges } from "./polygon";
import { add, dot, length, scale, sub, unit } from "./vector";
import { createMatch, stepMatch } from "./match";
import { levelDifficulty } from "./difficulty";
import { beginArenaMorph, stepArenaMorph } from "./arena-morph";
import { DEFAULT_OPTIONS } from "./types";

it("uses deterministic ten-level shape bands and retains the classic level-100 finale", () => {
  expect([1, 9, 10, 19, 20, 29, 30, 40, 50, 60, 70, 80, 90, 100].map(levelArenaShape)).toEqual([
    "classic",
    "classic",
    "wide",
    "wide",
    "faceted",
    "faceted",
    "classic",
    "wide",
    "faceted",
    "classic",
    "wide",
    "faceted",
    "classic",
    "classic",
  ]);
  expect(arenaVariant(createArena().vertices, 4, "classic")).toEqual(createArena().vertices);
});
it("gives every defender symmetric convex walls, keeping actual bats and containers inside in all layouts and shapes", () => {
  for (const count of [2, 3, 4, 5, 6] as const)
    for (const shape of ["classic", "wide", "faceted"] as ArenaShape[]) {
      const arena = createArena(count, undefined, 0.27, 0.7, shape),
        edges = polygonEdges(arena.vertices);
      expect(arena.vertices.length).toBeLessThanOrEqual(12);
      for (const p of arena.vertices) {
        const turn = (2 * Math.PI) / count,
          rotated = {
            x: p.x * Math.cos(turn) - p.y * Math.sin(turn),
            y: p.x * Math.sin(turn) + p.y * Math.cos(turn),
          };
        expect(Math.min(...arena.vertices.map((q) => length(sub(q, rotated))))).toBeLessThan(1e-7);
        for (const edge of edges)
          expect(dot(sub(p, edge.start), edge.normal)).toBeGreaterThan(-1e-7);
      }
      for (const home of arena.fortresses) {
        for (const piece of home.pieces.slice(0, 3))
          for (const edge of edges)
            expect(dot(sub(piece, edge.start), edge.normal)).toBeGreaterThan(ARENA.pieceRadius);
        for (const offset of home.angleLimits!)
          for (let i = 0; i <= 20; i++) {
            const angle = home.direction + offset,
              point = add(
                batCentre(home.id, angle, arena),
                scale(
                  unit(angle - batHalfAngle(arena) + (i * batHalfAngle(arena)) / 10),
                  ARENA.batRadius,
                ),
              );
            for (const edge of edges)
              expect(dot(sub(point, edge.start), edge.normal)).toBeGreaterThanOrEqual(
                ARENA.paddleThickness / 2 + 0.014,
              );
          }
      }
    }
});
it("freezes the level shape through eliminations, retaining identity and bat width", () => {
  for (const level of [10, 20]) {
    const state = createMatch(4, 6, 3, 4, levelDifficulty(level)),
      width = batHalfAngle(state.arena);
    for (const id of [1, 3, 5, 4]) {
      state.players[id]!.health.fill(false);
      state.eliminations.push({ seat: id, elapsed: 0 });
      beginArenaMorph(state);
      while (state.morph) {
        stepArenaMorph(state, 0.25);
        expect(state.arena.variant).toBe(levelDifficulty(level).arenaShape);
        expect(batHalfAngle(state.arena)).toBe(width);
      }
    }
    expect(state.arena.count).toBe(2);
    expect(state.players.filter((p) => p.health.some(Boolean)).map((p) => p.id)).toEqual([0, 2]);
  }
});
it("keeps seeded bot play deterministic with no collision caps across every variant layout", () => {
  for (const count of [2, 3, 4, 5, 6] as const)
    for (const level of [10, 20]) {
      const run = () => {
        let state = createMatch(2026, count, 3, 2026, levelDifficulty(level));
        state.phase = "playing";
        for (let tick = 0; tick < 120 * 8 && state.phase !== "finished"; tick++)
          state = stepMatch(state, undefined, { ...DEFAULT_OPTIONS, humanSeat: -1 });
        expect(state.stats.collisionCaps).toBe(0);
        return state;
      };
      expect(run()).toEqual(run());
    }
});
