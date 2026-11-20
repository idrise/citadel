import { MAX_SWIPE_CURVE, spinBounce } from "./flight";
import type { BallState } from "./types";
import type { Vec2 } from "./vector";

export const WALL_ESCAPE_AFTER = 4;
// Radians/second added before wall grip: later unattended banks get stronger nudges.
export const WALL_ESCAPE_SPIN_STEP = 0.18;

/** Count real wall banks since the last bat/serve; never consume gameplay RNG.
 * Preserve existing spin direction, choosing a stable direction for a straight ball.
 * The usual grip, inward-departure and speed bounds still own the actual rebound. */
export function bounceWall(
  ball: Pick<BallState, "id" | "velocity" | "spin" | "wallBounces">,
  normal: Vec2,
) {
  const wallBounces = (ball.wallBounces ?? 0) + 1;
  let spin = Number.isFinite(ball.spin) ? (ball.spin ?? 0) : 0;
  if (wallBounces > WALL_ESCAPE_AFTER) {
    const direction = Math.sign(spin) || (ball.id % 2 === 0 ? 1 : -1);
    spin =
      direction *
      Math.min(
        MAX_SWIPE_CURVE,
        Math.abs(spin) + (wallBounces - WALL_ESCAPE_AFTER) * WALL_ESCAPE_SPIN_STEP,
      );
  }
  return { ...spinBounce(ball.velocity, normal, spin), wallBounces };
}
