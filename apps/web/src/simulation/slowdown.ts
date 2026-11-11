import { ARENA, fortress } from "./arena";
import { alive, type BallState, type MatchState } from "./types";
import { pressureReliefBalls, PRESSURE_HORIZON } from "./defence-pressure";
import { angleDifference, angleOf, dot, length, sub } from "./vector";

export const APPROACH_SPEED_FACTOR = 0.55;

/** Shared human/bot rule. Pressure starts relief; a retained outer boundary lets the second catch finish without flicker. Stored velocity stays full speed. */
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
        Math.abs(angleDifference(angleOf(delta), fortress(player.id).direction)) <
        ARENA.sectorHalfAngle;
      const pendingLimit = ARENA.railRadius + 0.4 + length(ball.velocity) * PRESSURE_HORIZON;
      if (
        nearAngle &&
        distance > ARENA.railRadius + 0.3 &&
        distance < pendingLimit &&
        dot(delta, ball.velocity) < 0 &&
        (ball.slowSeat === player.id || pressureReliefBalls(state, player.id).has(ball.id))
      )
        return {
          seat: player.id,
          factor: distance < ARENA.railRadius + 2.1 ? APPROACH_SPEED_FACTOR : 1,
        };
    }
  return { seat: null, factor: 1 };
}
