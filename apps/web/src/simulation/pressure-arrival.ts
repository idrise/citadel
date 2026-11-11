import { ARENA, FIXED_DT, fortress } from "./arena";
import { sweepCircle, sweepPaddle, sweepWalls } from "./collision";
import { curveFlight } from "./flight";
import { alive, type BallState, type MatchState } from "./types";
import { add, length, scale, sub, type Vec2 } from "./vector";

function blocked(
  state: MatchState,
  seat: number,
  position: Vec2,
  velocity: Vec2,
  time: number,
): boolean {
  if (sweepWalls(position, velocity, time).length) return true;
  for (const defender of state.players) {
    if (!alive(defender)) continue;
    if (
      defender.id !== seat &&
      sweepPaddle(position, velocity, defender.id, defender.angle, 0, time)
    )
      return true;
    for (let index = 0; index < defender.pieces.length; index++) {
      if (!defender.health[index]) continue;
      const body = defender.pieces[index]!;
      if (sweepCircle(position, velocity, body.position, body.radius + ARENA.ballRadius, time))
        return true;
    }
  }
  return false;
}

/** Nominal arrival estimate for pressure relief. Curved shots use the shared fixed-step flight model. */
export function pressureArrival(state: MatchState, ball: BallState, seat: number, horizon: number) {
  const anchor = fortress(seat).anchor;
  if (length(sub(ball.position, anchor)) > ARENA.railRadius + 0.4 + length(ball.velocity) * horizon)
    return null;
  let position = ball.position,
    velocity = ball.velocity,
    spin = ball.spin ?? 0;
  const step = spin === 0 ? horizon : FIXED_DT;
  for (let elapsed = 0; elapsed < horizon - 1e-9; elapsed += step) {
    const dt = Math.min(step, horizon - elapsed);
    const flight = curveFlight(velocity, spin, dt);
    velocity = flight.velocity;
    spin = flight.spin;
    const hit = sweepCircle(position, velocity, anchor, ARENA.railRadius + 0.4, dt);
    if (blocked(state, seat, position, velocity, hit?.time ?? dt)) return null;
    if (hit) return { time: elapsed + hit.time, point: add(position, scale(velocity, hit.time)) };
    position = add(position, scale(velocity, dt));
  }
  return null;
}
