import { Color, MeshPhysicalMaterial } from "three";

/** Dark satin metal: broad rough highlights instead of a bright diffuse face. */
export function frostedMaterial(colour = 0x27313e): MeshPhysicalMaterial {
  return new MeshPhysicalMaterial({
    color: new Color(colour).lerp(new Color(0x667585), 0.25),
    metalness: 0.9,
    roughness: 0.34,
    clearcoat: 0.25,
    clearcoatRoughness: 0.4,
    envMapIntensity: 1.1,
  });
}
