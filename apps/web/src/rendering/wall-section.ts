import { BoxGeometry, ExtrudeGeometry, Shape } from "three";
import { ARENA } from "../simulation/arena";

export const WALL_HEIGHT = 2.22;
export const WALL_THICKNESS = 0.96;
export const WALL_CENTRE = ARENA.halfSize + WALL_THICKNESS / 2;
export const WALL_PANEL_HEIGHT = 1.56;
export const WALL_PANEL_CENTRE_Y = 1.06;

/** Solid six-sided cap profile: a broad deck, two chamfered shoulders and visible underside. */
export function createWallCap(length: number) {
  const shape = new Shape();
  shape.moveTo(0, 1.84);
  shape.lineTo(-WALL_THICKNESS, 1.84);
  shape.lineTo(-WALL_THICKNESS, 2.04);
  shape.lineTo(-0.78, WALL_HEIGHT);
  shape.lineTo(-0.18, WALL_HEIGHT);
  shape.lineTo(0, 2.04);
  shape.closePath();
  const geometry = new ExtrudeGeometry(shape, { depth: length, bevelEnabled: false, steps: 1 });
  geometry.rotateY(Math.PI / 2);
  geometry.translate(-length / 2, 0, 0);
  return geometry;
}
export function createWallFoot(length: number) {
  const geometry = new BoxGeometry(length, 0.28, WALL_THICKNESS);
  geometry.translate(0, 0.14, WALL_THICKNESS / 2);
  return geometry;
}
