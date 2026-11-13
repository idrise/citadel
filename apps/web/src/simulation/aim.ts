import {
  ARENA,
  clampPaddleAngle,
  fortress,
  railPosition,
  SQUARE_ARENA,
  type ArenaGeometry,
} from "./arena";
import { angleDifference, angleOf, clamp, sub, unit, type Vec2 } from "./vector";

/** Spread the full mouse travel over the arena, including both adjacent fortresses. */
export function serveDirection(
  seat: number,
  paddleAngle: number,
  arena: ArenaGeometry = SQUARE_ARENA,
): Vec2 {
  const home = fortress(seat, arena);
  const fan = home.halfAngle < 0.7 ? 3.5 : 2;
  const spread = arena.count > 6 ? Math.PI * 0.68 : 1.45;
  return unit(
    home.direction + clamp(angleDifference(paddleAngle, home.direction) * fan, -spread, spread),
  );
}

/** Invert the serve fan from its actual moving launch point, using visible targets only. */
export function aimServeAt(
  seat: number,
  target: Vec2,
  arena: ArenaGeometry = SQUARE_ARENA,
): number {
  const base = fortress(seat, arena).direction;
  let low = clampPaddleAngle(seat, base - 2, arena);
  let high = clampPaddleAngle(seat, base + 2, arena);
  for (let iteration = 0; iteration < 28; iteration++) {
    const angle = (low + high) / 2;
    const origin = railPosition(seat, angle, ARENA.railRadius + 0.4, arena);
    const desired = angleOf(sub(target, origin));
    const actual = angleOf(serveDirection(seat, angle, arena));
    if (angleDifference(desired, actual) > 0) low = angle;
    else high = angle;
  }
  return (low + high) / 2;
}
