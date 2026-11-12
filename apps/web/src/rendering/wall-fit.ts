import { Mesh, Vector3 } from "three";

/** Keep the same GPU buffers throughout a morph. Bounded endpoint shear joins
 * adjacent beams without rebuilding crease geometry or pinching very short edges. */
export function createWallFit(mesh: Mesh, depthOffset = 0) {
  const position = mesh.geometry.getAttribute("position");
  const normal = mesh.geometry.getAttribute("normal");
  const template = new Float32Array(position.array);
  const normals = new Float32Array(normal.array);
  const edges = mesh.children.find((child) => child.name === "feature-edges") as Mesh | undefined;
  const attributes = edges
    ? ["edgeStart", "edgeEnd"].map((name) => {
        const attribute = edges.geometry.getAttribute(name);
        return { attribute, original: new Float32Array(attribute.array) };
      })
    : [];
  const n = new Vector3();
  let key = "";
  return (length: number, startMiter: number, endMiter: number) => {
    const safeLength = Math.max(0.02, length);
    const bound = Math.min(4, safeLength / 1.92);
    const start = Math.max(-bound, Math.min(bound, startMiter));
    const end = Math.max(-bound, Math.min(bound, endMiter));
    const next = `${safeLength}:${start}:${end}`;
    if (next === key) return;
    key = next;
    const shear = (x: number) => (x < 0 ? -start : end) / safeLength;
    for (let i = 0; i < position.count; i++) {
      const x = template[i * 3]!,
        z = template[i * 3 + 2]!;
      position.setX(i, x + (z + depthOffset) * shear(x));
      n.set(
        normals[i * 3]!,
        normals[i * 3 + 1]!,
        normals[i * 3 + 2]! - normals[i * 3]! * shear(x),
      ).normalize();
      normal.setXYZ(i, n.x, n.y, n.z);
    }
    position.needsUpdate = normal.needsUpdate = true;
    mesh.geometry.computeBoundingBox();
    mesh.geometry.computeBoundingSphere();
    for (const { attribute, original } of attributes) {
      for (let i = 0; i < attribute.count; i++) {
        const x = original[i * 3]!,
          z = original[i * 3 + 2]!;
        attribute.setX(i, x + (z + depthOffset) * shear(x));
      }
      attribute.needsUpdate = true;
    }
    if (edges) {
      edges.geometry.boundingBox = mesh.geometry.boundingBox!.clone();
      edges.geometry.boundingSphere = mesh.geometry.boundingSphere!.clone();
    }
  };
}
