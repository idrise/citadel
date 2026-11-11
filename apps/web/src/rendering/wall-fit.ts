import { Mesh } from "three";
import { featureEdgeGeometry } from "./feature-edges";

/** Shear each outer endpoint to its neighbour's offset line. The inner face stays
 * exactly on the collider, while caps/feet/panels join without overlapping boxes. */
export function createWallFit(mesh: Mesh, depthOffset = 0) {
  const position = mesh.geometry.getAttribute("position"),
    template = new Float32Array(position.array);
  return (length: number, startMiter: number, endMiter: number) => {
    for (let i = 0; i < position.count; i++) {
      const x = template[i * 3]!,
        z = template[i * 3 + 2]!;
      const correction = ((z + depthOffset) * (x < 0 ? -startMiter : endMiter)) / length;
      position.setX(i, x + correction);
    }
    position.needsUpdate = true;
    mesh.geometry.computeVertexNormals();
    mesh.geometry.computeBoundingBox();
    mesh.geometry.computeBoundingSphere();
    const edges = mesh.children.find((child) => child.name === "feature-edges") as Mesh | undefined;
    if (edges) {
      edges.geometry.dispose();
      edges.geometry = featureEdgeGeometry(mesh.geometry);
    }
  };
}
