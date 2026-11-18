import { ARENA } from "./arena";
import { sweepCircle, type Contact } from "./collision";
import { MAX_SWIPE_CURVE } from "./flight";
import type { BallState } from "./types";
import { add, clamp, dot, length, normalise, scale, sub, type Vec2 } from "./vector";

const DIAMETER = ARENA.ballRadius * 2;
const EPSILON = 1e-8;

/** Relative swept circles catch crossings even when both endpoints are disjoint. */
export function sweepBalls(
  a: BallState,
  b: BallState,
  va: Vec2,
  vb: Vec2,
  dt: number,
): Contact | null {
  const relative = sub(a.position, b.position),
    velocity = sub(va, vb);
  const distance = length(relative);
  if (distance < DIAMETER - EPSILON) {
    // An exact overlap has no geometric normal. Relative approach, then stable IDs,
    // provide a deterministic direction without consuming gameplay randomness.
    const normal =
      distance > EPSILON
        ? scale(relative, 1 / distance)
        : length(velocity) > EPSILON
          ? scale(normalise(velocity), -1)
          : { x: a.id < b.id ? -1 : 1, y: 0 };
    return { time: 0, normal, separation: DIAMETER - distance };
  }
  const hit = sweepCircle(a.position, velocity, b.position, DIAMETER, dt);
  return hit && dot(velocity, hit.normal) < -EPSILON ? hit : null;
}

/** Equal-mass elastic response. Live flights restore their paced speeds at the tick
 * boundary, after all contacts, so dense chains retain a consistent impulse solution.
 * Signed curve rates exchange on impact, transferring spin without amplifying it.
 * Separating overlaps are only repaired: they must never rebounce or swap spin. */
export function resolveBallContact(a: BallState, b: BallState, normal: Vec2, fa = 1, fb = 1) {
  const va = scale(a.velocity, fa),
    vb = scale(b.velocity, fb);
  const closing = dot(sub(va, vb), normal);
  if (closing < -EPSILON) {
    a.velocity = scale(sub(va, scale(normal, closing)), 1 / fa);
    b.velocity = scale(add(vb, scale(normal, closing)), 1 / fb);
    const spin = (value: number | undefined) =>
      Number.isFinite(value) ? clamp(value ?? 0, -MAX_SWIPE_CURVE, MAX_SWIPE_CURVE) : 0;
    const sa = spin(a.spin),
      sb = spin(b.spin);
    a.spin = sb;
    b.spin = sa;
    a.slowSeat = null;
    b.slowSeat = null;
  }
  const correction = Math.max(0, DIAMETER - length(sub(a.position, b.position))) / 2 + 0.00005;
  a.position = add(a.position, scale(normal, correction));
  b.position = sub(b.position, scale(normal, correction));
  return closing < -EPSILON;
}
