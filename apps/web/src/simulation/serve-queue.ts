import { ARENA, railPosition, type ArenaGeometry } from "./arena";
import { containCircle } from "./polygon";
import { add, length, scale, sub, unit, type Vec2 } from "./vector";

/** Separate waiting serves, including the larger visible shell, without pushing them through walls. */
export function queuedServePosition(
  seat: number,
  angle: number,
  index: number,
  arena: ArenaGeometry,
  occupied: readonly Vec2[],
): Vec2 {
  const gap = ARENA.ballRadius * 3;
  const ideal = railPosition(seat, angle, ARENA.railRadius + 0.4 + index * gap, arena);
  const side = unit(angle + Math.PI / 2);
  const contain = (point: Vec2) => containCircle(point, ARENA.ballRadius + 0.1, arena.vertices);
  for (let attempt = 0; attempt < 33; attempt++) {
    const offset = attempt === 0 ? 0 : Math.ceil(attempt / 2) * (attempt % 2 ? 1 : -1) * gap;
    const position = contain(add(ideal, scale(side, offset)));
    if (occupied.every((other) => length(sub(position, other)) >= gap - 1e-8)) return position;
  }
  return contain(ideal);
}
