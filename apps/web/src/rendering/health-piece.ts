import { CylinderGeometry, Group, Mesh } from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
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
  // Cap and base use the same material and move together. Combining them also
  // combines their outlines, reducing draws in the main and reflection passes.
  capGeometry.translate(0, 1.105, 0);
  baseGeometry.translate(0, 0.05, 0);
  const trimGeometry = mergeGeometries([capGeometry, baseGeometry])!;
  capGeometry.dispose();
  baseGeometry.dispose();
  const bodyMaterial = frostedMaterial(0x283442);
  const capMaterial = frostedMaterial(0x354150);
  // Broad matte trim keeps a centred point light from reading as a glowing
  // filled cap on only the middle piece. Neon outlines provide the emphasis.
  capMaterial.roughness = 0.95;
  capMaterial.metalness = 0.15;
  capMaterial.clearcoat = 0;
  const outlines = [bodyGeometry, trimGeometry].map((geometry) =>
    createFeatureEdgeFactory(geometry, colour, { width: 3, power: 1.8 }),
  );
  return () => {
    const root = new Group();
    let index = 0;
    for (const [geometry, material, height] of [
      [bodyGeometry, bodyMaterial, 0.55],
      [trimGeometry, capMaterial, 0],
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
