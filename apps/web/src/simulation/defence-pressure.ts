import { ARENA, clampPaddleAngle, fortress } from "./arena";
import { pressureArrival } from "./pressure-arrival";
import { alive, type MatchState } from "./types";
import { angleDifference, angleOf, sub } from "./vector";

export const PRESSURE_HORIZON = 0.45;
// Nearby arrivals can share one bat pose; only disjoint catching intervals demand a fast move.
const COVERAGE_HALF_ANGLE = 0.3;

/** Optional relief for separated, tightly spaced catches. Independent of human/bot ownership. */
export function pressureReliefBalls(state: MatchState, seat: number): Set<number> {
  const relief = new Set<number>();
  const player = state.players[seat];
  if (!player || !alive(player)) return relief;
  const home = fortress(seat, state.arena);
  const low = clampPaddleAngle(seat, home.direction - 1, state.arena),
    high = clampPaddleAngle(seat, home.direction + 1, state.arena);
  const threats = state.balls
    .flatMap((ball) => {
      if (ball.phase !== "active") return [];
      const hit = pressureArrival(state, ball, seat, PRESSURE_HORIZON);
      if (!hit) return [];
      const point = hit.point;
      const angle =
        home.direction + angleDifference(angleOf(sub(point, home.anchor)), home.direction);
      if (angle < low - COVERAGE_HALF_ANGLE || angle > high + COVERAGE_HALF_ANGLE) return [];
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
