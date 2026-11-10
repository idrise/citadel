import { add, angleDifference, clamp, scale, unit, type Vec2 } from "./vector";

export const ARENA = {
  halfSize: 9,
  railRadius: 4.4,
  sectorHalfAngle: Math.PI / 4,
  paddleHalfAngle: 0.24,
  paddleThickness: 0.28,
  paddleSpeed: 3.2,
  healthRadius: 2.7,
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
  { x: -9, y: 9 },
  { x: 9, y: 9 },
  { x: 9, y: -9 },
  { x: -9, y: -9 },
].map((anchor, id) => {
  const direction = Math.atan2(-anchor.y, -anchor.x);
  const pieces = Array.from({ length: ARENA.pieces }, (_, index) => {
    const angle =
      direction - ARENA.sectorHalfAngle + ((index + 0.5) * Math.PI) / (2 * ARENA.pieces);
    return add(anchor, scale(unit(angle), ARENA.healthRadius));
  });
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
    (ARENA.ballRadius + ARENA.paddleThickness / 2 + 0.01) / ARENA.railRadius,
  );
  const limit = ARENA.sectorHalfAngle - ARENA.paddleHalfAngle - endClearance;
  return base + clamp(angleDifference(angle, base), -limit, limit);
}
export function railPosition(seat: number, angle: number, radius: number = ARENA.railRadius): Vec2 {
  return add(fortress(seat).anchor, scale(unit(angle), radius));
}
