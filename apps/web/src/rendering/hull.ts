import { BufferGeometry, Float32BufferAttribute, Mesh, type Material } from "three";
import type { Vec2 } from "../simulation/vector";
import { featureEdgeGeometry } from "./feature-edges";

/** An origin-centred radial fan and bevelled side rings, including the victory star. */
export function hullGeometry(
  vertices: readonly Vec2[],
  margin: number,
  top: number,
  depth: number,
): BufferGeometry {
  const positions: number[] = [];
  const point = (index: number, y: number, outset: number) => {
    const p = vertices[index % vertices.length]!,
      radius = Math.hypot(p.x, p.y);
    return [p.x * (1 + outset / radius), y, p.y * (1 + outset / radius)];
  };
  const triangle = (a: number[], b: number[], c: number[]) => positions.push(...a, ...c, ...b);
  const bevel = 0.08;
  for (let i = 0; i < vertices.length; i++) {
    triangle([0, top, 0], point(i + 1, top, margin), point(i, top, margin));
    const rings = [
      [top, margin],
      [top - bevel, margin + bevel],
      [top - depth + bevel, margin + bevel],
      [top - depth, margin],
    ];
    for (let r = 0; r < rings.length - 1; r++) {
      const [y, a] = rings[r]!,
        [nextY, b] = rings[r + 1]!;
      const p = point(i, y!, a!),
        q = point(i + 1, y!, a!),
        v = point(i, nextY!, b!),
        w = point(i + 1, nextY!, b!);
      triangle(p, q, v);
      triangle(q, w, v);
    }
    triangle([0, top - depth, 0], point(i, top - depth, margin), point(i + 1, top - depth, margin));
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}
export function replaceHull(
  mesh: Mesh<BufferGeometry, Material | Material[]>,
  geometry: BufferGeometry,
): void {
  mesh.geometry.dispose();
  mesh.geometry = geometry;
  const edges = mesh.children.find((child) => child.name === "feature-edges") as Mesh | undefined;
  if (edges) {
    edges.geometry.dispose();
    edges.geometry = featureEdgeGeometry(geometry);
  }
}
