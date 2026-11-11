import { expect, it } from "vite-plus/test";
import {
  ARENA,
  batCentre,
  clampPaddleAngle,
  createArena,
  railPosition,
  type PlayerCount,
} from "./arena";
import { aimServeAt, serveDirection } from "./aim";
import { polygonEdges } from "./polygon";
import { sweepCircle, sweepWalls } from "./collision";
import { add, dot, length, scale, sub, unit } from "./vector";

const counts = [2, 3, 4, 5, 6] as const;
it.each(counts)(
  "keeps eight physical pieces and every permitted bat pose inside the %s-seat polygon",
  (count) => {
    const arena = createArena(count);
    expect(arena.fortresses).toHaveLength(count);
    expect(arena.vertices).toHaveLength(count === 2 ? 4 : count);
    for (const home of arena.fortresses) {
      expect(home.pieces).toHaveLength(8);
      for (const point of home.pieces)
        for (const edge of polygonEdges(arena.vertices))
          expect(dot(sub(point, edge.start), edge.normal)).toBeGreaterThan(ARENA.pieceRadius);
      for (const offset of [-2, -0.15, 0, 0.15, 2]) {
        const angle = clampPaddleAngle(home.id, home.direction + offset, arena);
        expect(
          length(sub(railPosition(home.id, angle, ARENA.railRadius, arena), home.anchor)),
        ).toBeCloseTo(4.4);
        for (const end of [-1, 0, 1]) {
          const point = add(
            batCentre(home.id, angle, arena),
            scale(unit(angle + end * ARENA.batHalfAngle), ARENA.batRadius),
          );
          for (const edge of polygonEdges(arena.vertices))
            expect(dot(sub(point, edge.start), edge.normal)).toBeGreaterThan(
              ARENA.paddleThickness / 2,
            );
        }
      }
    }
  },
);
it.each(counts)(
  "can aim at every rival and sweep fast bank shots in the %s-seat layout",
  (count) => {
    const arena = createArena(count);
    for (const home of arena.fortresses)
      for (const rival of arena.fortresses) {
        if (home.id === rival.id) continue;
        const target = rival.pieces[3]!,
          angle = aimServeAt(home.id, target, arena);
        const origin = railPosition(home.id, angle, 4.8, arena),
          velocity = scale(serveDirection(home.id, angle, arena), 240);
        const hit = sweepCircle(origin, velocity, target, ARENA.pieceRadius + ARENA.ballRadius, 1);
        expect(hit, `${count}: ${home.id} → ${rival.id}`).not.toBeNull();
        expect(sweepWalls(origin, velocity, hit!.time, arena)).toHaveLength(0);
      }
    for (const edge of polygonEdges(arena.vertices)) {
      const middle = scale(add(edge.start, edge.end), 0.5),
        inward = scale(edge.normal, 2);
      const hits = sweepWalls(add(middle, inward), scale(edge.normal, -1000), 0.01, arena);
      const first = hits.sort((a, b) => a.time - b.time)[0]!;
      expect(first.time).toBeCloseTo((2 - ARENA.ballRadius) / 1000);
      expect(dot(first.normal, edge.normal)).toBeCloseTo(1);
    }
  },
);
it("places two defenders at the midpoints of opposite short rectangle ends, and preserves regular symmetry", () => {
  const rectangle = createArena(2);
  expect(rectangle.fortresses.map((s) => s.anchor)).toEqual([
    { x: 0, y: 11 },
    { x: 0, y: -11 },
  ]);
  for (const count of [3, 4, 5, 6] as PlayerCount[]) {
    const arena = createArena(count),
      edges = polygonEdges(arena.vertices);
    const lengths = edges.map((e) => length(sub(e.start, e.end)));
    lengths.forEach((value) => expect(value).toBeCloseTo(lengths[0]!));
    expect(arena.vertices.reduce((sum, p) => sum + p.x, 0)).toBeCloseTo(0);
    expect(arena.vertices.reduce((sum, p) => sum + p.y, 0)).toBeCloseTo(0);
  }
});
