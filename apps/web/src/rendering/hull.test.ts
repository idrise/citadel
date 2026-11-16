import { expect, it } from "vite-plus/test";
import { createArena } from "../simulation/arena";
import { matchOutlines, blendOutline } from "../simulation/outline-transition";
import { hullEdgeGeometry } from "./hull";

it("keeps all four plinth rings closed while corners flatten, without angle-triggered vertical seams", () => {
  const outline = matchOutlines(createArena(6).vertices, createArena(5).vertices);
  for (let sample = 0; sample <= 100; sample++) {
    const vertices = blendOutline(outline, sample / 100);
    const geometry = hullEdgeGeometry(vertices, 0.55, -0.17, 2.1);
    const a = geometry.getAttribute("edgeStart"),
      b = geometry.getAttribute("edgeEnd");
    expect(geometry.instanceCount).toBe(vertices.length * 4);
    for (let ring = 0; ring < 4; ring++)
      for (let i = 0; i < vertices.length; i++) {
        const p = ring * vertices.length + i,
          next = ring * vertices.length + ((i + 1) % vertices.length);
        expect(a.getY(p)).toBe(b.getY(p));
        expect([b.getX(p), b.getY(p), b.getZ(p)]).toEqual([
          a.getX(next),
          a.getY(next),
          a.getZ(next),
        ]);
      }
    geometry.dispose();
  }
});
