import { ARENA } from "./arena";
import { clamp, dot, normalise, type Vec2 } from "./vector";

export const MAX_SWIPE_CURVE = 0.28; // radians / second; under 6.2 degrees total at full swipe
export const CURVE_DECAY = 2.6;

/** Gentle flight-only rotation, with exact exponential decay. Zero curve preserves the old straight path. */
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

/** A moving bat brushes the ball into a small bend; a held bat keeps the established return aim. */
export function swipeCurve(angularVelocity: number, incoming: Vec2, normal: Vec2): number {
  const approach = clamp(-dot(normalise(incoming), normal), 0, 1);
  return clamp(angularVelocity / ARENA.paddleSpeed, -1, 1) * MAX_SWIPE_CURVE * approach;
}
