import { expect, it } from "vite-plus/test";
import {
  ARENA,
  batCentre,
  batHalfAngle,
  batRadius,
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
  "moves triangle fortresses inwards and increases usable bat travel at level %i without moving original corners",
  (level) => {
    const state = createMatch(7, 3, 3, 7, levelDifficulty(level)),
      arena = state.arena;
    expect(arena.vertices).toHaveLength(arena.variant ? 6 : 3);
    for (const [index, home] of arena.fortresses.entries()) {
      const tip = arena.vertices[index * (arena.variant ? 2 : 1)]!;
      expect(length(tip)).toBeCloseTo(13);
      expect(length(home.anchor)).toBeCloseTo(length(arena.vertices[0]!) - TRIANGLE_FORTRESS_INSET);
      expect(length(sub(home.anchor, tip))).toBeCloseTo(TRIANGLE_FORTRESS_INSET);
      const old = fitDefenceLimits({
        ...arena,
        count: 4,
        batWallGap: 0.015,
        fortresses: [{ ...home, anchor: tip }],
      });
      if (!arena.variant)
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
                batRadius(arena),
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
  "retains a genuine ball corridor beside centred triangle bats at level %i",
  async (level) => {
    const { sweepPaddle, sweepWalls } = await import("./collision");
    const arena = createMatch(7, 3, 3, 7, levelDifficulty(level)).arena,
      edges = polygonEdges(arena.vertices);

    for (const home of arena.fortresses)
      for (const offset of [0]) {
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
        expect(distance - ARENA.paddleThickness / 2).toBeGreaterThan(ARENA.ballRadius * 2 + 0.2);
        const centre = add(point, scale(edge.normal, ARENA.ballRadius + 0.04 - distance));
        const tangent = scale(sub(edge.end, edge.start), 1 / length(sub(edge.end, edge.start)));
        const start = add(centre, scale(tangent, -0.5)),
          velocity = scale(tangent, 12);
        expect(sweepPaddle(start, velocity, home.id, angle, 0, 1 / 12, arena)).toBeNull();
        expect(sweepWalls(start, velocity, 1 / 12, arena)).toHaveLength(0);
      }
  },
);
/** Sample the visible bow independently of the limit solver, including the bat skin. */
function skinGap(arena: import("./arena").ArenaGeometry, id: number, angle: number) {
  let gap = Infinity;
  const centre = batCentre(id, angle, arena);
  for (let sample = 0; sample <= 512; sample++) {
    const point = add(
      centre,
      scale(unit(angle + batHalfAngle(arena) * (sample / 256 - 1)), batRadius(arena)),
    );
    for (const edge of polygonEdges(arena.vertices))
      gap = Math.min(gap, dot(sub(point, edge.start), edge.normal) - ARENA.paddleThickness / 2);
  }
  return gap;
}

it("reaches both triangle walls at every level without moving the forward anchor or changing bat width", () => {
  for (let level = 1; level <= 100; level++) {
    const arena = createMatch(7, 3, 3, 7, levelDifficulty(level)).arena;
    for (const home of arena.fortresses) {
      expect(length(home.anchor)).toBeCloseTo(length(arena.vertices[0]!) - TRIANGLE_FORTRESS_INSET);
      for (const offset of home.angleLimits!) {
        const gap = skinGap(arena, home.id, home.direction + offset);
        expect(gap, `level ${level}, seat ${home.id}, offset ${offset}`).toBeGreaterThanOrEqual(
          0.015 - 1e-6,
        );
        expect(gap, `level ${level}, seat ${home.id}, offset ${offset}`).toBeLessThan(0.016);
      }
    }
  }
});

it.each([1, 50, 100])(
  "keeps the bat inside the walls while morphing to three survivors at level %i",
  (level) => {
    const state = createMatch(7, 4, 3, 7, levelDifficulty(level));
    const width = batHalfAngle(state.arena),
      radius = batRadius(state.arena);
    state.players[1]!.health.fill(false);
    state.eliminations.push({ seat: 1, elapsed: 0 });
    beginArenaMorph(state);
    let tick = 0;
    while (state.morph) {
      stepArenaMorph(state, 1 / 120);
      if (++tick % 12 && state.morph) continue;
      for (const player of state.players.filter((p) => p.health.some(Boolean))) {
        const home = fortress(player.id, state.arena);
        for (const offset of [home.angleLimits![0], 0, home.angleLimits![1]])
          expect(skinGap(state.arena, home.id, home.direction + offset)).toBeGreaterThanOrEqual(
            0.015 - 1e-6,
          );
      }
    }
    expect(batHalfAngle(state.arena)).toBe(width);
    expect(batRadius(state.arena)).toBe(radius);
    for (const player of state.players.filter((p) => p.health.some(Boolean))) {
      const home = fortress(player.id, state.arena);
      expect(length(home.anchor)).toBeCloseTo(
        length(state.arena.vertices[0]!) - TRIANGLE_FORTRESS_INSET,
      );
      for (const offset of home.angleLimits!)
        expect(skinGap(state.arena, home.id, home.direction + offset)).toBeLessThan(0.016);
    }
  },
);
