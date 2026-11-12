import { healthFormation } from "./health-layout";
import { add, angleDifference, clamp, scale, unit, type Vec2 } from "./vector";

import { ARENA } from "./arena-tuning";
import { fitDefenceLimits } from "./defence-limits";
export { ARENA, FIXED_DT, MAX_BALLS } from "./arena-tuning";
export type PlayerCount = 2 | 3 | 4 | 5 | 6;
export interface ArenaGeometry {
  count: PlayerCount;
  batHalfAngle?: number;
  vertices: Vec2[];
  fortresses: Fortress[];
}
export interface Fortress {
  id: number;
  anchor: Vec2;
  direction: number;
  halfAngle: number;
  angleLimits?: readonly [number, number];
  pieces: Vec2[];
}

/** Keep the original square exact; other layouts share the same rail and piece dimensions. */
export function createArena(
  count: PlayerCount = 4,
  ids: number[] = Array.from({ length: count }, (_, i) => i),
  rotation = 0,
  batScale = 1,
): ArenaGeometry {
  if (![2, 3, 4, 5, 6].includes(count) || ids.length !== count || new Set(ids).size !== count)
    throw new Error("Arena needs 2–6 distinct seats");
  const rotate = (point: Vec2): Vec2 => ({
    x: point.x * Math.cos(rotation) - point.y * Math.sin(rotation),
    y: point.x * Math.sin(rotation) + point.y * Math.cos(rotation),
  });
  const radius = count === 3 ? 13 : count === 4 ? Math.sqrt(162) : count === 5 ? 14 : 15;
  const anchors =
    count === 2
      ? [
          { x: 0, y: 11 },
          { x: 0, y: -11 },
        ].map(rotate)
      : Array.from({ length: count }, (_, i) => {
          if (count === 4)
            return rotate(
              [
                { x: -9, y: 9 },
                { x: 9, y: 9 },
                { x: 9, y: -9 },
                { x: -9, y: -9 },
              ][i]!,
            );
          const angle = (Math.PI * 3) / 4 - (i * Math.PI * 2) / count;
          return rotate(scale(unit(angle), radius));
        });
  const vertices =
    count === 2
      ? [
          { x: -6, y: 11 },
          { x: 6, y: 11 },
          { x: 6, y: -11 },
          { x: -6, y: -11 },
        ].map(rotate)
      : anchors.map((p) => ({ ...p }));
  const halfAngle = count === 2 ? Math.PI / 2 : Math.PI / 2 - Math.PI / count;
  const fortresses = anchors.map((anchor, index) => {
    const direction = Math.atan2(-anchor.y, -anchor.x);
    const pieceAnchor = count === 3 ? add(anchor, scale(unit(direction), 0.6)) : anchor;
    return {
      id: ids[index]!,
      anchor,
      direction,
      halfAngle,
      pieces: healthFormation(
        pieceAnchor,
        direction,
        ARENA.legacyFormationPieces,
        ARENA.pieceRadius,
      ),
    };
  });
  return fitDefenceLimits({
    count,
    vertices,
    fortresses,
    ...(batScale === 1 ? {} : { batHalfAngle: ARENA.batHalfAngle * batScale }),
  });
}
export const SQUARE_ARENA = createArena();
export const FORTRESSES: readonly Fortress[] = SQUARE_ARENA.fortresses;

export function fortress(id: number, arena: ArenaGeometry = SQUARE_ARENA): Fortress {
  const result = arena.fortresses.find((seat) => seat.id === id);
  if (!result) throw new Error(`Unknown fortress ${id}`);
  return result;
}
export function clampPaddleAngle(
  seat: number,
  angle: number,
  arena: ArenaGeometry = SQUARE_ARENA,
): number {
  const home = fortress(seat, arena);
  const base = home.direction;
  const limit = home.halfAngle - batHalfAngle(arena) / 2;
  return (
    base +
    clamp(
      angleDifference(angle, base),
      home.angleLimits?.[0] ?? -limit,
      home.angleLimits?.[1] ?? limit,
    )
  );
}
export function railPosition(
  seat: number,
  angle: number,
  radius: number = ARENA.railRadius,
  arena: ArenaGeometry = SQUARE_ARENA,
): Vec2 {
  return add(fortress(seat, arena).anchor, scale(unit(angle), radius));
}

/** Bat curvature is independent of the arc along which its midpoint travels. */
export function batCentre(seat: number, angle: number, arena: ArenaGeometry = SQUARE_ARENA): Vec2 {
  return railPosition(seat, angle, ARENA.railRadius - ARENA.batRadius, arena);
}

/** Physical arc extent shared by collision, rail limits, previews and rendering. */
export function batHalfAngle(arena: ArenaGeometry = SQUARE_ARENA): number {
  return arena.batHalfAngle ?? ARENA.batHalfAngle;
}
