import { Color, MeshBasicMaterial } from "three";

/** HDR geometry supplies the bright core; bloom spreads its saturated colour into the dark scene. */
export function neonMaterial(colour: number, power = 3) {
  return new MeshBasicMaterial({
    color: new Color(colour).multiplyScalar(power),
    toneMapped: false,
  });
}
