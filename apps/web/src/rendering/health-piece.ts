import { Color, CylinderGeometry, Group, Mesh, MeshBasicMaterial, TorusGeometry } from "three";
import { frostedMaterial } from "./frosted-material";
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
  const bodyMaterial = frostedMaterial(0x283442);
  const capMaterial = frostedMaterial(0x354150);
  const rimGeometry = new TorusGeometry(ARENA.pieceRadius * 0.88, 0.018, 6, 24);
  const rimMaterial = new MeshBasicMaterial({ color: new Color(colour).multiplyScalar(2.2) });
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
    const rim = new Mesh(rimGeometry, rimMaterial);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 1.17;
    root.add(rim);
    return root;
  };
}
