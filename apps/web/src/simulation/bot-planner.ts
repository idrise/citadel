import { SUPPLIES } from "./supplies";
import { advanceRally, rallyBaseSpeed } from "./rally";
import { ARENA, fortress } from "./arena";
import { sweepCircle, sweepPaddle, sweepWalls } from "./collision";
import { curveFlight, spinBounce } from "./flight";
import { alive, type MatchState } from "./types";
import { add, angleDifference, angleOf, length, scale, sub, type Vec2 } from "./vector";

/** Bounded visible-state forecast: curve, wall banks and intervening actors.
 * No future inputs, RNG writes or full-match search. At most 30 steps per ball. */
export function planIntercept(
  state: MatchState,
  seat: number,
  horizon: number,
  speed: number = ARENA.pointerPaddleSpeed,
) {
  const home = fortress(seat, state.arena),
    player = state.players[seat]!;
  let best: {
    point: Vec2;
    velocity: Vec2;
    time: number;
    angle: number;
    ballId: number;
    spin: number;
    rallyTime?: number;
  } | null = null;
  for (const source of state.balls) {
    if (
      source.phase !== "active" ||
      length(sub(source.position, home.anchor)) - ARENA.railRadius >
        length(source.velocity) * horizon
    )
      continue;
    const passedSupplies = new Set<number>();
    const forecast = { ...source };
    const baseSpeed = state.difficulty?.ballSpeed ?? rallyBaseSpeed(source);
    let position = { ...source.position },
      velocity = { ...source.velocity },
      spin = source.spin;
    for (let elapsed = 0; elapsed < horizon - 1e-8; elapsed += 1 / 30) {
      const dt = Math.min(1 / 30, horizon - elapsed);
      forecast.velocity = velocity;
      advanceRally(forecast, baseSpeed, dt, source.rallyTime !== undefined);
      const flight = curveFlight(forecast.velocity, spin, dt);
      velocity = flight.velocity;
      spin = flight.spin;
      const rail = sweepCircle(
        position,
        velocity,
        home.anchor,
        ARENA.railRadius + ARENA.ballRadius + ARENA.paddleThickness / 2,
        dt,
      );
      const surfaces = sweepWalls(position, velocity, dt, state.arena).map((hit) => ({
        ...hit,
        pickup: -1,
      }));
      for (const drop of state.supplies) {
        if (drop.age < SUPPLIES.fall || passedSupplies.has(drop.id)) continue;
        const hit = sweepCircle(
          position,
          velocity,
          drop.position,
          SUPPLIES.radius + ARENA.ballRadius,
          dt,
        );
        if (hit) surfaces.push({ ...hit, pickup: drop.id });
      }
      const wall = surfaces.sort((a, b) => a.time - b.time)[0];
      const travel = Math.min(rail?.time ?? dt, wall?.time ?? dt);
      let blocked = false;
      for (const other of state.players) {
        if (!alive(other)) continue;
        if (
          other.id !== seat &&
          sweepPaddle(position, velocity, other.id, other.angle, 0, travel, state.arena)
        ) {
          blocked = true;
          break;
        }
        if (
          other.pieces.some(
            (piece, i) =>
              other.health[i] &&
              sweepCircle(
                position,
                velocity,
                piece.position,
                piece.radius + ARENA.ballRadius,
                travel,
              ),
          )
        ) {
          blocked = true;
          break;
        }
      }
      if (blocked) break;
      if (rail && rail.time <= (wall?.time ?? dt)) {
        const point = add(position, scale(velocity, rail.time)),
          time = elapsed + rail.time;
        const angle = angleOf(sub(point, home.anchor));
        // Prioritise the earliest reachable catch; deterministic ball ID resolves ties.
        const reach = Math.abs(angleDifference(angle, player.angle)) / speed;
        if (
          reach <= time + 0.08 &&
          (!best || time < best.time || (time === best.time && source.id < best.ballId))
        )
          best = {
            point,
            velocity,
            time,
            angle,
            ballId: source.id,
            spin: spin ?? 0,
            ...(forecast.rallyTime !== undefined ? { rallyTime: forecast.rallyTime } : {}),
          };
        break;
      }
      if (wall) {
        if (wall.pickup >= 0) passedSupplies.add(wall.pickup);
        position = add(
          add(position, scale(velocity, wall.time)),
          scale(wall.normal, (wall.separation ?? 0) + 0.0001),
        );
        const rebound = spinBounce(velocity, wall.normal, spin);
        velocity = rebound.velocity;
        spin = rebound.spin;
        position = add(position, scale(velocity, dt - wall.time));
      } else position = add(position, scale(velocity, dt));
    }
  }
  return best;
}
