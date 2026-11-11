import {
  InstancedMesh,
  Line,
  Mesh,
  type BufferGeometry,
  type Material,
  type Object3D,
} from "three";

/** Shared geometry/materials are disposed exactly once per scene. */
export function disposeScene(scene: Object3D): void {
  const geometries = new Set<BufferGeometry>();
  const materials = new Set<Material>();
  scene.traverse((object) => {
    if (!(object instanceof Mesh) && !(object instanceof Line)) return;
    if (object instanceof InstancedMesh) object.dispose();
    geometries.add(object.geometry);
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      materials.add(material);
    }
  });
  for (const geometry of geometries) geometry.dispose();
  for (const material of materials) material.dispose();
}
