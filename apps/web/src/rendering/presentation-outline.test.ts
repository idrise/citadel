import { expect, it } from "vite-plus/test";
import { createArena } from "../simulation/arena";
import { victoryOutlines } from "./victory-morph";
import {
  blendPresentationOutline,
  matchPresentationOutlines,
  visibleCorners,
} from "./presentation-outline";
import { dot, length, scale, sub, type Vec2 } from "../simulation/vector";
function edgeDistance(p: Vec2, vertices: readonly Vec2[]) {
  return Math.min(
    ...vertices.map((a, i) => {
      const d = sub(vertices[(i + 1) % vertices.length]!, a),
        t = Math.max(0, Math.min(1, dot(sub(p, a), d) / dot(d, d)));
      return length(sub(p, { x: a.x + d.x * t, y: a.y + d.y * t }));
    }),
  );
}
it("preserves star notches through every next-arena transition without folding or exploding the wall count", () => {
  for (const count of [2, 3, 4, 5, 6] as const)
    for (const target of [2, 3, 4, 5, 6] as const) {
      const star = victoryOutlines(createArena(count).vertices, Math.PI * 0.75).to,
        arena = createArena(target).vertices;
      const matched = matchPresentationOutlines(star, arena);
      expect(matched.from.length).toBeLessThanOrEqual(12);
      for (const p of star) expect(edgeDistance(p, matched.from)).toBeLessThan(1e-7);
      for (const p of arena) expect(edgeDistance(p, matched.to)).toBeLessThan(1e-7);
      for (let frame = 0; frame <= 20; frame++) {
        const points = blendPresentationOutline(matched, frame / 20);
        for (let i = 0; i < points.length; i++) {
          const a = points[i]!,
            b = points[(i + 1) % points.length]!;
          expect(a.x * b.y - a.y * b.x).toBeLessThan(1e-6);
        }
      }
    }
});
it("removes collinear samples without turning a star into its convex hull", () => {
  const star = Array.from({ length: 10 }, (_, i) =>
    scale({ x: Math.cos((-i * Math.PI) / 5), y: Math.sin((-i * Math.PI) / 5) }, i % 2 ? 4.7 : 9.2),
  );
  expect(visibleCorners(star)).toHaveLength(10);
  const withMidpoints = star.flatMap((p, i) => [
    p,
    scale({ x: p.x + star[(i + 1) % 10]!.x, y: p.y + star[(i + 1) % 10]!.y }, 0.5),
  ]);
  expect(visibleCorners(withMidpoints)).toEqual(star);
});
