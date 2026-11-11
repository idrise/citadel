import { CylinderGeometry, Group, Mesh } from "three";
import { createFeatureEdgeFactory } from "./feature-edges";
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
  const outlines = [bodyGeometry, capGeometry, baseGeometry].map((geometry) =>
    createFeatureEdgeFactory(geometry, colour, { width: 3, power: 1.8 }),
  );
  return () => {
    const root = new Group();
    let index = 0;
    for (const [geometry, material, height] of [
      [bodyGeometry, bodyMaterial, 0.55],
      [capGeometry, capMaterial, 1.105],
      [baseGeometry, capMaterial, 0.05],
    ] as const) {
      const part = new Mesh(geometry, material);
      part.position.y = height;
      part.castShadow = true;
      part.receiveShadow = true;
      part.add(outlines[index++]!());
      root.add(part);
    }
    return root;
  };
}
