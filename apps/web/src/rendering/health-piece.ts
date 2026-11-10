import { Color, CylinderGeometry, Group, Mesh, MeshStandardMaterial } from "three";
import { ARENA } from "../simulation/arena";

/** The circular footprint matches simulation; height and cap are presentation only. */
export function createHealthFactory(colour: number) {
  const bodyGeometry = new CylinderGeometry(ARENA.pieceRadius * 0.94, ARENA.pieceRadius, 0.98, 24);
  const capGeometry = new CylinderGeometry(
    ARENA.pieceRadius * 0.78,
    ARENA.pieceRadius * 0.94,
    0.13,
    24,
  );
  const baseGeometry = new CylinderGeometry(ARENA.pieceRadius, ARENA.pieceRadius, 0.08, 24);
  const bodyMaterial = new MeshStandardMaterial({
    color: new Color(colour).multiplyScalar(0.48),
    emissive: colour,
    emissiveIntensity: 0.06,
    roughness: 0.3,
    metalness: 0.5,
  });
  const capMaterial = new MeshStandardMaterial({
    color: colour,
    emissive: colour,
    emissiveIntensity: 1.15,
    roughness: 0.35,
    metalness: 0.3,
  });
  return () => {
    const root = new Group();
    for (const [geometry, material, height] of [
      [bodyGeometry, bodyMaterial, 0.55],
      [capGeometry, capMaterial, 1.105],
      [baseGeometry, capMaterial, 0.05],
    ] as const) {
      const part = new Mesh(geometry, material);
      part.position.y = height;
      part.castShadow = true;
      part.receiveShadow = true;
      root.add(part);
    }
    return root;
  };
}
