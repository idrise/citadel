import { Color, CylinderGeometry, Group, Mesh, type ShaderMaterial } from "three";
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
  const edgeMaterials: ShaderMaterial[] = [];
  const protectionColour = new Color(colour).lerp(new Color(0xe8f5ff), 0.25);
  function make() {
    const root = new Group();
    let index = 0;
    for (const [geometry, material, height] of [
      [bodyGeometry, bodyMaterial, 0.55],
      [trimGeometry, capMaterial, 0],
    ] as const) {
      const part = new Mesh(geometry, material);
      part.position.y = height;
      const outline = outlines[index]!();
      edgeMaterials[index] ??= outline.material;
      index++;
      part.add(outline);
      root.add(part);
    }
    return root;
  }
  make.setProtection = (amount: number) => {
    bodyMaterial.emissive.copy(protectionColour);
    capMaterial.emissive.copy(protectionColour);
    bodyMaterial.emissiveIntensity = amount * 0.85;
    capMaterial.emissiveIntensity = amount * 0.35;
    for (const material of edgeMaterials)
      (material.uniforms.neonColour!.value as Color).setHex(colour).multiplyScalar(1.8 + amount);
  };
  return make;
}
