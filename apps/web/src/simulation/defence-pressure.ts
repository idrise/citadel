import { ARENA, clampPaddleAngle, fortress } from "./arena";
import { sweepCircle, sweepPaddle, sweepWalls } from "./collision";
import { alive, type MatchState } from "./types";
import { angleDifference, angleOf, add, scale, sub } from "./vector";

export const PRESSURE_HORIZON = 0.45;
// Nearby arrivals can share one bat pose; only disjoint catching intervals demand a fast move.
const COVERAGE_HALF_ANGLE = 0.3;

/** Optional relief for separated, tightly spaced catches. Independent of human/bot ownership. */
export function pressureReliefBalls(state: MatchState, seat: number): Set<number> {
  const relief = new Set<number>();
  const player = state.players[seat];
  if (!player || !alive(player)) return relief;
  const home = fortress(seat);
  const low = clampPaddleAngle(seat, home.direction - 1),
    high = clampPaddleAngle(seat, home.direction + 1);
  const threats = state.balls
    .flatMap((ball) => {
      if (ball.phase !== "active") return [];
      const hit = sweepCircle(
        ball.position,
        ball.velocity,
        home.anchor,
        ARENA.railRadius + 0.4,
        PRESSURE_HORIZON,
      );
      if (!hit || sweepWalls(ball.position, ball.velocity, hit.time).length) return [];
      const point = add(ball.position, scale(ball.velocity, hit.time));
      const angle =
        home.direction + angleDifference(angleOf(sub(point, home.anchor)), home.direction);
      if (angle < low - COVERAGE_HALF_ANGLE || angle > high + COVERAGE_HALF_ANGLE) return [];
      for (const defender of state.players) {
        if (!alive(defender)) continue;
        if (
          defender.id !== seat &&
          sweepPaddle(ball.position, ball.velocity, defender.id, defender.angle, 0, hit.time)
        )
          return [];
        for (let piece = 0; piece < defender.pieces.length; piece++) {
          if (!defender.health[piece]) continue;
          const body = defender.pieces[piece]!;
          if (
            sweepCircle(
              ball.position,
              ball.velocity,
              body.position,
              body.radius + ARENA.ballRadius,
              hit.time,
            )
          )
            return [];
        }
      }
      return [
        {
          id: ball.id,
          time: hit.time,
          low: Math.max(low, angle - COVERAGE_HALF_ANGLE),
          high: Math.min(high, angle + COVERAGE_HALF_ANGLE),
        },
      ];
    })
    .sort((a, b) => a.time - b.time);
  for (let first = 0; first < threats.length; first++)
    for (let second = first + 1; second < threats.length; second++) {
      const a = threats[first]!,
        b = threats[second]!;
      const between = Math.max(0, a.low - b.high, b.low - a.high);
      if (between < 0.06) continue;
      const toFirst = Math.max(0, a.low - player.angle, player.angle - a.high);
      const interval = Math.max(1 / 120, b.time - a.time);
      if (
        between / interval > ARENA.paddleSpeed * 0.75 ||
        (toFirst + between) / Math.max(1 / 120, b.time) > ARENA.paddleSpeed * 0.75
      )
        relief.add(b.id);
    }
  return relief;
}

export function hasDefencePressure(state: MatchState, seat: number): boolean {
  return pressureReliefBalls(state, seat).size > 0;
}
