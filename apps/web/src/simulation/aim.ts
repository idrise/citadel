import { ARENA, clampPaddleAngle, fortress, railPosition } from "./arena";
import { angleDifference, angleOf, sub, unit, type Vec2 } from "./vector";

/** Spread the full mouse travel over the arena, including both adjacent fortresses. */
export function serveDirection(seat: number, paddleAngle: number): Vec2 {
  const base = fortress(seat).direction;
  return unit(base + angleDifference(paddleAngle, base) * 2);
}

/** Invert the serve fan from its actual moving launch point, using visible targets only. */
export function aimServeAt(seat: number, target: Vec2): number {
  const base = fortress(seat).direction;
  let low = clampPaddleAngle(seat, base - 2);
  let high = clampPaddleAngle(seat, base + 2);
  for (let iteration = 0; iteration < 28; iteration++) {
    const angle = (low + high) / 2;
    const origin = railPosition(seat, angle, ARENA.railRadius + 0.4);
    const desired = angleOf(sub(target, origin));
    const actual = angleOf(serveDirection(seat, angle));
    if (angleDifference(desired, actual) > 0) low = angle;
    else high = angle;
  }
  return (low + high) / 2;
}
