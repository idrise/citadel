import { expect, it } from "vite-plus/test";
import { BAT_PROFILES, levelBatProfile } from "./bat-profile";
import {
  ARENA,
  PLAYER_COUNTS,
  batRadius,
  batHalfAngle,
  batCentre,
  createArena,
  fortress,
} from "./arena";
import { levelDifficulty } from "./difficulty";
import { createMatch } from "./match";
import { beginArenaMorph, stepArenaMorph } from "./arena-morph";
import { sweepPaddle, paddleReturn, sweepWalls } from "./collision";
import { polygonEdges } from "./polygon";
import { add, dot, scale, sub, unit, length } from "./vector";
import { angleDifference, angleOf } from "./vector";

it("introduces deterministic five-level profiles while retaining the exact existing width ramp", () => {
  expect([1, 6, 11, 16].map(levelBatProfile)).toEqual(["standard", "shallow", "deep", "standard"]);
  const seen = new Set();
  for (let level = 1; level <= 100; level++) {
    const rules = levelDifficulty(level),
      state = createMatch(2026, 6, 3, 2026, rules),
      arena = state.arena;
    seen.add(rules.batProfile);
    expect(batRadius(arena) * Math.sin(batHalfAngle(arena))).toBeCloseTo(
      ARENA.batRadius * Math.sin(ARENA.batHalfAngle * rules.batScale),
      10,
    );
    expect(arena.batProfile ?? "standard").toBe(rules.batProfile);
  }
  expect(seen.size).toBe(3);
});
it.each(["standard", "shallow", "deep"] as const)(
  "keeps the %s bow inside every arena at both rail limits and returns real contacts",
  (profile) => {
    for (const count of PLAYER_COUNTS)
      for (const variant of ["classic", "wide", "faceted", "compact", "spacious"] as const)
        for (const width of [0.7, 1.35]) {
          const arena = createArena(count, undefined, 0, width, variant, profile),
            radius = batRadius(arena),
            half = batHalfAngle(arena),
            edges = polygonEdges(arena.vertices);
          for (const home of arena.fortresses) {
            for (const offset of home.angleLimits!)
              for (let sample = 0; sample <= 8; sample++) {
                const angle = home.direction + offset,
                  point = add(
                    batCentre(home.id, angle, arena),
                    scale(unit(angle - half + (sample * half) / 4), radius),
                  );
                for (const edge of edges)
                  expect(dot(sub(point, edge.start), edge.normal)).toBeGreaterThanOrEqual(
                    ARENA.paddleThickness / 2 + (arena.batWallGap ?? 0.015) - 1e-6,
                  );
              }
          }
          const angle = fortress(0, arena).direction,
            forward = unit(angle),
            incoming = scale(forward, -24),
            start = add(batCentre(0, angle, arena), scale(forward, radius + 2)),
            hit = sweepPaddle(start, incoming, 0, angle, 0, 0.2, arena)!;
          expect(hit).not.toBeNull();
          expect(length(paddleReturn(incoming, hit.offset, hit.normal))).toBeCloseTo(24, 9);
        }
  },
  15000,
);
it("carries the current profile and width unchanged through elimination morphs", () => {
  for (const level of [6, 11, 21, 100]) {
    const state = createMatch(2026, 6, 3, 2026, levelDifficulty(level)),
      radius = batRadius(state.arena),
      half = batHalfAngle(state.arena);
    state.players[2]!.health.fill(false);
    state.eliminations.push({ seat: 2, elapsed: 0 });
    beginArenaMorph(state);
    for (let frame = 0; state.morph && frame < 100; frame++) {
      stepArenaMorph(state, 0.1);
      expect(batRadius(state.arena)).toBe(radius);
      expect(batHalfAngle(state.arena)).toBe(half);
    }
    expect(state.arena.count).toBe(5);
    expect(batRadius(state.arena)).toBe(BAT_PROFILES[levelBatProfile(level)].radius);
  }
});

it.each(["standard", "shallow", "deep"] as const)(
  "retains real bank returns on both sides of the %s bat across every roster and arena family",
  (profile) => {
    for (const count of PLAYER_COUNTS)
      for (const variant of ["classic", "wide", "faceted", "compact", "spacious"] as const)
        for (const width of [0.7, 1.35]) {
          const arena = createArena(count, undefined, 0, width, variant, profile),
            home = fortress(0, arena),
            radius = batRadius(arena),
            edges = polygonEdges(arena.vertices),
            tangent = unit(home.direction + Math.PI / 2);
          // Every family is rotationally symmetric, so one fortress covers all seats.
          for (const side of [-1, 1]) {
            let reachable = false;
            // A particular contact offset need not bank in every bow: search legal strikes.
            for (const travel of [0, 0.25, 0.5, 0.75, 1]) {
              if (reachable) break;
              for (const offset of [-0.9, -0.6, -0.3, 0, 0.3, 0.6, 0.9]) {
                const angle = home.direction + home.angleLimits![side < 0 ? 0 : 1] * travel,
                  normal = unit(angle + offset * batHalfAngle(arena)),
                  origin = add(
                    batCentre(0, angle, arena),
                    scale(normal, radius + ARENA.paddleThickness / 2 + ARENA.ballRadius),
                  ),
                  incoming = scale(normal, -24),
                  contact = sweepPaddle(
                    add(origin, scale(normal, 0.08)),
                    incoming,
                    0,
                    angle,
                    0,
                    0.01,
                    arena,
                  );
                if (!contact) continue;
                if (
                  edges.some((edge) => dot(sub(origin, edge.start), edge.normal) < ARENA.ballRadius)
                )
                  continue;
                const outgoing = paddleReturn(incoming, contact.offset, contact.normal),
                  wall = sweepWalls(origin, outgoing, 2, arena).sort((a, b) => a.time - b.time)[0];
                if (!wall || dot(wall.normal, tangent) * side >= -0.01) continue;
                const impact = add(origin, scale(outgoing, wall.time)),
                  rebound = sub(outgoing, scale(wall.normal, 2 * dot(outgoing, wall.normal))),
                  after = add(impact, scale(rebound, 0.001));
                // Leave simultaneous corner rebounds to the existing multi-contact tests.
                if (
                  edges.some((edge) => dot(sub(after, edge.start), edge.normal) < ARENA.ballRadius)
                )
                  continue;
                for (const edge of edges)
                  expect(dot(sub(after, edge.start), edge.normal)).toBeGreaterThanOrEqual(
                    ARENA.ballRadius - 1e-6,
                  );
                reachable = true;
                break;
              }
            }
            expect(reachable, `${count}/${variant}/${width}/${side}`).toBe(true);
          }
        }
  },
);

it("gives the same-width bows distinct, mirrored contact aiming rather than cosmetic silhouettes", () => {
  const turns: number[] = [];
  for (const profile of ["shallow", "standard", "deep"] as const) {
    const arena = createArena(4, undefined, 0, 1, "classic", profile),
      radius = batRadius(arena),
      angle = fortress(0, arena).direction,
      centre = batCentre(0, angle, arena),
      normal = unit(angle),
      tangent = unit(angle + Math.PI / 2),
      halfSpan = radius * Math.sin(batHalfAngle(arena));
    const mirrored: number[] = [];
    for (const side of [-1, 1]) {
      const start = add(
          add(centre, scale(normal, radius + 2)),
          scale(tangent, halfSpan * side * 0.7),
        ),
        incoming = scale(normal, -24),
        hit = sweepPaddle(start, incoming, 0, angle, 0, 0.2, arena)!;
      expect(hit).not.toBeNull();
      mirrored.push(
        angleDifference(angleOf(paddleReturn(incoming, hit.offset, hit.normal)), angle),
      );
    }
    expect(mirrored[0]).toBeCloseTo(-mirrored[1]!, 8);
    turns.push(mirrored[1]!);
  }
  expect(turns[0]).toBeLessThan(turns[1]!);
  expect(turns[1]).toBeLessThan(turns[2]!);
});
