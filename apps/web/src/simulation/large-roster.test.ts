import { expect, it } from "vite-plus/test";
import { MAX_PLAYERS, PLAYER_COUNTS, isPlayerCount } from "./player-count";
import { ARENA, batCentre, batHalfAngle, createArena, railPosition } from "./arena";
import { levelDifficulty } from "./difficulty";
import { createMatch, stepMatch } from "./match";
import { beginArenaMorph, stepArenaMorph } from "./arena-morph";
import { DEFAULT_OPTIONS, IDLE_INTENT } from "./types";
import { polygonEdges } from "./polygon";
import { add, dot, length, scale, sub, unit } from "./vector";
import { aimServeAt, serveDirection } from "./aim";
import { parsePreferences } from "../session/preferences";
import { freshProgress, recordResult, parseProgress } from "../session/progression";
import { SEATS } from "../rendering/palette";

it("supports exactly 2–16 distinct coloured seats and round-trips extended preferences and results", () => {
  expect(MAX_PLAYERS).toBe(16);
  expect(PLAYER_COUNTS).toHaveLength(15);
  expect([1, 17, NaN, 8.5, "16"].some(isPlayerCount)).toBe(false);
  expect(SEATS).toHaveLength(16);
  expect(new Set(SEATS.map((s) => s.colour)).size).toBe(16);
  const prefs = parsePreferences(
    JSON.stringify({
      version: 1,
      count: 16,
      humanSeat: 15,
      settings: { musicVolume: 0.2, effectsVolume: 0.8 },
    }),
  );
  expect(prefs).toMatchObject({
    count: 16,
    humanSeat: 15,
    settings: { musicVolume: 0.2, effectsVolume: 0.8 },
  });
  const progress = recordResult(freshProgress(), { level: 1, count: 16, place: 1, at: 100 });
  expect(parseProgress(JSON.stringify({ version: 2, ...progress }))).toEqual(progress);
});
it("keeps all five symmetric convex families, containers and the full bat surfaces legal through every supported roster", () => {
  for (const count of PLAYER_COUNTS)
    for (const variant of ["classic", "wide", "faceted", "compact", "spacious"] as const) {
      const arena = createArena(count, undefined, 0, 1.35, variant),
        edges = polygonEdges(arena.vertices);
      expect(arena.vertices.length).toBeLessThanOrEqual(32);
      expect(arena.fortresses).toHaveLength(count);
      for (const vertex of arena.vertices) {
        const angle = (2 * Math.PI) / count,
          rotated = {
            x: vertex.x * Math.cos(angle) - vertex.y * Math.sin(angle),
            y: vertex.x * Math.sin(angle) + vertex.y * Math.cos(angle),
          };
        expect(Math.min(...arena.vertices.map((p) => length(sub(p, rotated))))).toBeLessThan(1e-7);
        for (const edge of edges)
          expect(dot(sub(vertex, edge.start), edge.normal)).toBeGreaterThan(-1e-7);
      }
      for (const home of arena.fortresses) {
        for (const point of home.pieces.slice(0, 3))
          for (const edge of edges)
            expect(dot(sub(point, edge.start), edge.normal)).toBeGreaterThan(ARENA.pieceRadius);
        for (const offset of home.angleLimits!)
          for (let sample = 0; sample <= 10; sample++) {
            const angle = home.direction + offset,
              point = add(
                batCentre(home.id, angle, arena),
                scale(
                  unit(angle - batHalfAngle(arena) + (sample / 5) * batHalfAngle(arena)),
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
it("lets extended rosters aim at both adjacent banks from their actual serve origins", () => {
  for (const count of [7, 8, 12, 16] as const)
    for (const variant of ["classic", "wide", "faceted", "compact", "spacious"] as const) {
      const arena = createArena(count, undefined, 0, 1.35, variant);
      for (const home of arena.fortresses)
        for (const step of [-1, 1]) {
          const target = arena.fortresses[(home.id + step + count) % count]!.pieces[0]!,
            angle = aimServeAt(home.id, target, arena),
            origin = railPosition(home.id, angle, ARENA.railRadius + 0.4, arena);
          const direction = serveDirection(home.id, angle, arena),
            delta = sub(target, origin),
            along = dot(delta, direction);
          expect(along).toBeGreaterThan(0);
          expect(length(sub(delta, scale(direction, along)))).toBeLessThan(
            ARENA.pieceRadius + ARENA.ballRadius,
          );
          expect(dot(direction, unit(angle))).toBeGreaterThan(0.3);
        }
    }
});
it("morphs a sixteen-seat expanded arena through a large elimination and an immediate retarget without unbounded outline search", () => {
  const state = createMatch(7, 16, 3, 7, levelDifficulty(2));
  for (const id of [1, 3, 5, 7, 9, 11, 13, 15]) {
    state.players[id]!.health.fill(false);
    state.eliminations.push({ seat: id, elapsed: 0 });
  }
  beginArenaMorph(state);
  stepArenaMorph(state, 0.2);
  for (const id of [2, 6, 10, 14]) {
    state.players[id]!.health.fill(false);
    state.eliminations.push({ seat: id, elapsed: 0 });
  }
  beginArenaMorph(state);
  while (state.morph) {
    stepArenaMorph(state, 0.1);
    expect(state.arena.vertices.length).toBeLessThanOrEqual(32);
  }
  expect(state.arena.count).toBe(4);
  expect(state.players.filter((p) => p.health.some(Boolean)).map((p) => p.id)).toEqual([
    0, 4, 8, 12,
  ]);
  expect(state.arena.variant).toBe("wide");
});
it("keeps sixteen-ball extended-roster play deterministic and below collision caps", () => {
  for (const count of [8, 12, 16] as const) {
    const run = () => {
      let state = createMatch(51, count, 3, 51, levelDifficulty(100));
      state.phase = "playing";
      state.elapsed = 40;
      const options = { ...DEFAULT_OPTIONS, humanSeat: -1 };
      state = stepMatch(state, IDLE_INTENT, { ...options, serveTimeout: Infinity }, 0);
      expect(state.balls).toHaveLength(16);
      for (let tick = 0; tick < 120; tick++) state = stepMatch(state, undefined, options);
      expect(state.stats.collisionCaps).toBe(0);
      return state;
    };
    expect(run()).toEqual(run());
  }
}, 30_000);
