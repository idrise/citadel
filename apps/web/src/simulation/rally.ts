import type { BallState } from "./types";
import { length, scale } from "./vector";

export const RALLY_GRACE = 8;
export const RALLY_GAIN_PER_SECOND = 0.05;
export const RALLY_MAX_MULTIPLIER = 1.75;

/** Each active flight has its own clock; pauses and ready-to-serve time do not count. */
export function rallyMultiplier(seconds: number) {
  return (
    1 +
    Math.min(RALLY_MAX_MULTIPLIER - 1, Math.max(0, seconds - RALLY_GRACE) * RALLY_GAIN_PER_SECOND)
  );
}

/** Rescale once per fixed step without changing direction, spin or RNG. */
export function advanceRally(
  ball: Pick<BallState, "phase" | "velocity" | "rallyTime">,
  baseSpeed: number,
  dt: number,
  enabled: boolean,
) {
  if (!enabled || ball.phase !== "active" || !Number.isFinite(dt) || dt <= 0) return;
  const elapsed = (ball.rallyTime ?? 0) + dt;
  ball.rallyTime = elapsed;
  const current = length(ball.velocity);
  if (current > 0 && Number.isFinite(baseSpeed) && baseSpeed > 0)
    ball.velocity = scale(ball.velocity, (baseSpeed * rallyMultiplier(elapsed)) / current);
}

/** Forecasts recover the same base speed, including explicitly enabled replay fixtures. */
export function rallyBaseSpeed(ball: Pick<BallState, "velocity" | "rallyTime">) {
  return length(ball.velocity) / rallyMultiplier(ball.rallyTime ?? 0);
}
