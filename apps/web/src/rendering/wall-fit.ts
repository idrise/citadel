import { Mesh } from "three";
import type { Vec2 } from "../simulation/vector";

/** Sweep a unit section between shared world-space joins. No inverse length,
 * local shear limit or per-section rotation can separate neighbouring sections. */
export function createWallFit(mesh: Mesh, depthOffset = 0) {
  const position = mesh.geometry.getAttribute("position");
  const template = new Float32Array(position.array);
  const edges = mesh.children.find((child) => child.name === "feature-edges") as Mesh | undefined;
  const attributes = edges
    ? ["edgeStart", "edgeEnd"].map((name) => {
        const attribute = edges.geometry.getAttribute(name);
        return { attribute, original: new Float32Array(attribute.array) };
      })
    : [];
  let key = "";
  return (start: Vec2, end: Vec2, startOffset: Vec2, endOffset: Vec2) => {
    const next = [
      start.x,
      start.y,
      end.x,
      end.y,
      startOffset.x,
      startOffset.y,
      endOffset.x,
      endOffset.y,
    ].join(":");
    if (next === key) return;
    key = next;
    const sweep = (x: number, y: number, z: number) => {
      const t = x + 0.5,
        s = 1 - t,
        depth = z + depthOffset;
      return [
        start.x * s + end.x * t + (startOffset.x * s + endOffset.x * t) * depth,
        y,
        start.y * s + end.y * t + (startOffset.y * s + endOffset.y * t) * depth,
      ] as const;
    };
    for (let i = 0; i < position.count; i++)
      position.setXYZ(i, ...sweep(template[i * 3]!, template[i * 3 + 1]!, template[i * 3 + 2]!));
    position.needsUpdate = true;
    mesh.geometry.computeVertexNormals();
    mesh.geometry.computeBoundingBox();
    mesh.geometry.computeBoundingSphere();
    for (const { attribute, original } of attributes) {
      for (let i = 0; i < attribute.count; i++)
        attribute.setXYZ(i, ...sweep(original[i * 3]!, original[i * 3 + 1]!, original[i * 3 + 2]!));
      attribute.needsUpdate = true;
    }
    // End-face creases are internal joints, including at a flattened corner.
    // The longitudinal strokes join the next section at the shared offsets.
    if (attributes.length === 2) {
      const a = attributes[0]!,
        b = attributes[1]!;
      for (let i = 0; i < a.attribute.count; i++)
        if (Math.abs(a.original[i * 3]! - b.original[i * 3]!) < 1e-6)
          b.attribute.setXYZ(i, a.attribute.getX(i), a.attribute.getY(i), a.attribute.getZ(i));
    }
    if (edges) {
      edges.geometry.boundingBox = mesh.geometry.boundingBox!.clone();
      edges.geometry.boundingSphere = mesh.geometry.boundingSphere!.clone();
    }
  };
}
