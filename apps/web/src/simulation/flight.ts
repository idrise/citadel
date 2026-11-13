import { ARENA } from "./arena";
import { add, clamp, dot, length, normalise, scale, sub, type Vec2 } from "./vector";

export const MAX_SWIPE_CURVE = 1.8; // radians / second; under 65 degrees total at full swipe
export const CURVE_DECAY = 1.6;
export const SWIPE_WINDOW = 0.1;

export interface BatSwipe {
  velocity: number;
  remaining: number;
}

/** Remember real bat motion briefly, so a mouse swipe need not land on the exact physics tick. */
export function rememberSwipe(
  previous: BatSwipe | undefined,
  velocity: number,
  dt: number,
): BatSwipe {
  if (Math.abs(velocity) > 1e-6)
    return {
      velocity: clamp(velocity, -ARENA.paddleSpeed, ARENA.paddleSpeed),
      remaining: SWIPE_WINDOW,
    };
  const remaining = Math.max(0, (previous?.remaining ?? 0) - Math.max(0, dt));
  return { velocity: remaining > 1e-9 ? (previous?.velocity ?? 0) : 0, remaining };
}

export function contactSwipe(swipe: BatSwipe | undefined, velocity: number): number {
  return Math.abs(velocity) > 1e-6
    ? velocity
    : (swipe?.velocity ?? 0) * clamp((swipe?.remaining ?? 0) / SWIPE_WINDOW, 0, 1);
}

/** Flight-only rotation, with exact exponential decay. Zero curve preserves the old straight path. */
export function curveFlight(velocity: Vec2, spin: number | undefined, dt: number) {
  const rate = Number.isFinite(spin) ? clamp(spin ?? 0, -MAX_SWIPE_CURVE, MAX_SWIPE_CURVE) : 0;
  if (rate === 0 || dt <= 0) return { velocity, spin: rate };
  const decay = Math.exp(-CURVE_DECAY * dt);
  const turn = (rate * (1 - decay)) / CURVE_DECAY;
  const c = Math.cos(turn),
    s = Math.sin(turn);
  const next = rate * decay;
  return {
    velocity: { x: velocity.x * c - velocity.y * s, y: velocity.x * s + velocity.y * c },
    spin: Math.abs(next) < 0.00001 ? 0 : next,
  };
}

/** A deliberate brush is readable even below maximum bat speed; held bats retain the established aim. */
export function swipeCurve(angularVelocity: number, incoming: Vec2, normal: Vec2): number {
  const approach = clamp(-dot(normalise(incoming), normal), 0, 1);
  const swipe = clamp(angularVelocity / ARENA.paddleSpeed, -1, 1);
  return Math.sign(swipe) * Math.sqrt(Math.abs(swipe)) * MAX_SWIPE_CURVE * (0.45 + 0.55 * approach);
}

/** A little tangential grip converts visible spin into a signed rebound angle.
 * Preserve speed and an inward departure, including almost tangent corner contacts.
 * Zero spin returns the existing aim vector exactly. */
export function spinReturn(outgoing: Vec2, normal: Vec2, spin: number | undefined): Vec2 {
  const rate = Number.isFinite(spin) ? clamp(spin ?? 0, -MAX_SWIPE_CURVE, MAX_SWIPE_CURVE) : 0;
  if (rate === 0) return outgoing;
  const speed = length(outgoing),
    tangent = { x: -normal.y, y: normal.x };
  let direction = normalise(add(outgoing, scale(tangent, (speed * 0.2 * rate) / MAX_SWIPE_CURVE)));
  if (dot(direction, normal) < 0.12)
    direction = normalise(add(scale(tangent, dot(direction, tangent)), scale(normal, 0.12)));
  return scale(direction, speed);
}
export function spinBounce(incoming: Vec2, normal: Vec2, spin: number | undefined) {
  const reflected = sub(incoming, scale(normal, 2 * dot(incoming, normal)));
  return {
    velocity: spinReturn(reflected, normal, spin),
    spin: (Number.isFinite(spin) ? clamp(spin ?? 0, -MAX_SWIPE_CURVE, MAX_SWIPE_CURVE) : 0) * 0.72,
  };
}
