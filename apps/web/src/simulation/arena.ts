import { healthFormation } from "./health-layout";
import { add, angleDifference, clamp, scale, unit, type Vec2 } from "./vector";

export const ARENA = {
  halfSize: 9,
  railRadius: 4.4,
  sectorHalfAngle: Math.PI / 4,
  paddleHalfAngle: 0.24,
  batRadius: 2.2,
  batHalfAngle: 0.48,
  paddleThickness: 0.28,
  paddleSpeed: 3.2,
  pieceRadius: 0.26,
  pieces: 8,
  ballRadius: 0.187,
} as const;
export const FIXED_DT = 1 / 120;
export interface Fortress {
  id: number;
  anchor: Vec2;
  direction: number;
  pieces: Vec2[];
}

export const FORTRESSES: readonly Fortress[] = [
  { x: -1, y: 1 },
  { x: 1, y: 1 },
  { x: 1, y: -1 },
  { x: -1, y: -1 },
].map((sign, id) => {
  const anchor = { x: sign.x * ARENA.halfSize, y: sign.y * ARENA.halfSize };
  const direction = Math.atan2(-anchor.y, -anchor.x);
  const pieces = healthFormation(anchor, direction, ARENA.pieces, ARENA.pieceRadius);
  return { id, anchor, direction, pieces };
});

export function fortress(id: number): Fortress {
  const result = FORTRESSES[id];
  if (!result) throw new Error(`Unknown fortress ${id}`);
  return result;
}
export function clampPaddleAngle(seat: number, angle: number): number {
  const base = fortress(seat).direction;
  const endClearance = Math.asin(
    (ARENA.ballRadius + ARENA.paddleThickness / 2 + 0.01) / (ARENA.railRadius - 0.2),
  );
  const limit = ARENA.sectorHalfAngle - ARENA.paddleHalfAngle - endClearance;
  return base + clamp(angleDifference(angle, base), -limit, limit);
}
export function railPosition(seat: number, angle: number, radius: number = ARENA.railRadius): Vec2 {
  return add(fortress(seat).anchor, scale(unit(angle), radius));
}

/** Bat curvature is independent of the arc along which its midpoint travels. */
export function batCentre(seat: number, angle: number): Vec2 {
  return railPosition(seat, angle, ARENA.railRadius - ARENA.batRadius);
}
