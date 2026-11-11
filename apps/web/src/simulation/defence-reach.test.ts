import { expect, it } from "vite-plus/test";
import { ARENA, batCentre, clampPaddleAngle, createArena } from "./arena";
import { serveDirection } from "./aim";
import { sweepPaddle } from "./collision";
import { polygonEdges } from "./polygon";
import { add, dot, normalise, scale, sub, unit } from "./vector";

it.each([2, 3, 4, 5, 6] as const)(
  "reaches both end walls in every %s-player seat and catches a ball hugging that wall",
  (count) => {
    const arena = createArena(count),
      edges = polygonEdges(arena.vertices);
    for (const home of arena.fortresses)
      for (const side of [-1, 1]) {
        const angle = clampPaddleAngle(home.id, home.direction + side * 2, arena);
        const endpoint = add(
          batCentre(home.id, angle, arena),
          scale(unit(angle + side * ARENA.batHalfAngle), ARENA.batRadius),
        );
        const edge = [...edges].sort(
          (a, b) => dot(sub(endpoint, a.start), a.normal) - dot(sub(endpoint, b.start), b.normal),
        )[0]!;
        const distance = dot(sub(endpoint, edge.start), edge.normal);
        expect(distance - ARENA.paddleThickness / 2).toBeGreaterThanOrEqual(0.014);
        expect(
          distance - ARENA.paddleThickness / 2,
          `${count} seat ${home.id} side ${side}`,
        ).toBeLessThan(0.017);
        const atWall = add(endpoint, scale(edge.normal, ARENA.ballRadius + 0.003 - distance));
        const tangent = normalise(sub(edge.end, edge.start));
        const towards = scale(tangent, Math.sign(dot(sub(home.anchor, endpoint), tangent)));
        const start = add(atWall, scale(towards, -1));
        const hit = sweepPaddle(start, scale(towards, 24), home.id, angle, 0, 0.06, arena);
        expect(hit, `${count} seat ${home.id} side ${side}`).not.toBeNull();
        expect(dot(serveDirection(home.id, angle, arena), unit(home.direction))).toBeGreaterThan(0);
      }
  },
);
