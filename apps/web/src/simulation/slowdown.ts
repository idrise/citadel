import { ARENA, fortress } from "./arena";
import { alive, type BallState, type MatchState } from "./types";
import { angleDifference, angleOf, dot, length, sub } from "./vector";

export const APPROACH_SPEED_FACTOR = 0.55;

/** Shared human/bot rule. A retained outer boundary avoids flicker; stored velocity stays full speed. */
export function approachSlowdown(
  state: MatchState,
  ball: BallState,
  enabled: boolean,
): { seat: number | null; factor: number } {
  if (enabled)
    for (const player of state.players) {
      if (!alive(player)) continue;
      const delta = sub(ball.position, fortress(player.id).anchor);
      const distance = length(delta);
      const nearAngle =
        Math.abs(angleDifference(angleOf(delta), player.angle)) < ARENA.paddleHalfAngle + 0.18;
      const outerLimit = ARENA.railRadius + (ball.slowSeat === player.id ? 2.6 : 2.1);
      if (
        nearAngle &&
        distance > ARENA.railRadius + 0.3 &&
        distance < outerLimit &&
        dot(delta, ball.velocity) < 0
      )
        return { seat: player.id, factor: APPROACH_SPEED_FACTOR };
    }
  return { seat: null, factor: 1 };
}
