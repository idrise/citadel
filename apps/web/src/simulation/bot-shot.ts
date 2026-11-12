import { ARENA, clampPaddleAngle } from "./arena";
import { paddleReturn, sweepPaddle, sweepWalls } from "./collision";
import { curveFlight, swipeCurve } from "./flight";
import { SUPPLIES } from "./supplies";
import { alive, type MatchState } from "./types";
import { add, clamp, dot, length, scale, sub, type Vec2 } from "./vector";

export interface BotTarget {
  position: Vec2;
  radius: number;
  reward: number;
  expires: number;
}
export interface BotShot {
  angle: number;
  swipe: number;
  score: number;
}

/** Public, currently available targets only. Supplies take priority over damage when reachable. */
export function botTargets(state: MatchState, seat: number, origin: Vec2): BotTarget[] {
  const targets: BotTarget[] = [];
  if (state.players[seat]!.health.filter(Boolean).length < SUPPLIES.maxPieces)
    for (const drop of state.supplies) {
      if (drop.age < SUPPLIES.fall || drop.age >= SUPPLIES.lifetime) continue;
      targets.push({
        position: drop.position,
        radius: SUPPLIES.radius,
        reward: 9,
        expires: SUPPLIES.lifetime - drop.age,
      });
    }
  for (const player of state.players) {
    if (player.id === seat || !alive(player)) continue;
    const nearest = player.pieces
      .filter((_, i) => player.health[i])
      .toSorted((a, b) => length(sub(a.position, origin)) - length(sub(b.position, origin)))[0];
    if (nearest)
      targets.push({
        position: nearest.position,
        radius: nearest.radius,
        reward: 5,
        expires: Infinity,
      });
  }
  return targets;
}

function segmentDistance(point: Vec2, start: Vec2, end: Vec2) {
  const travel = sub(end, start);
  const t = clamp(dot(sub(point, start), travel) / (dot(travel, travel) || 1), 0, 1);
  return length(sub(point, add(start, scale(travel, t))));
}

/** Small bounded search over real bat poses and signed swipes, using ordinary return/curve physics.
 * The incoming forecast is backed up briefly so each candidate must actually catch the ball.
 * At most 27 candidates x 24 flight steps; no simulation mutation or privileged hits. */
export function planBotShot(
  state: MatchState,
  seat: number,
  contact: { point: Vec2; velocity: Vec2; angle: number },
  speed: number,
  precision = 1,
): BotShot {
  const targets = botTargets(state, seat, contact.point);
  let best: BotShot = { angle: contact.angle, swipe: 0, score: -Infinity };
  const approach = 0.035;
  const stride = precision < 0.3 ? 4 : precision < 0.7 ? 2 : 1;
  const steps = Math.round(8 + 16 * precision);
  for (let offset = -4; offset <= 4; offset += stride) {
    const angle = clampPaddleAngle(seat, contact.angle + offset * 0.055, state.arena);
    const start = sub(contact.point, scale(contact.velocity, approach));
    const hit = sweepPaddle(start, contact.velocity, seat, angle, 0, approach * 2, state.arena);
    if (!hit) continue;
    const brush = Math.min(speed, ARENA.paddleSpeed) * precision;
    for (const swipe of precision < 0.2 ? [0] : [-brush, 0, brush]) {
      let position = add(add(start, scale(contact.velocity, hit.time)), scale(hit.normal, 0.001));
      let velocity = paddleReturn(contact.velocity, hit.offset, hit.normal);
      let spin = swipeCurve(swipe, contact.velocity, hit.normal);
      let score = -0.005 * Math.abs(swipe) - 0.002 * Math.abs(offset);
      for (let step = 0; step < steps; step++) {
        const dt = 1 / steps;
        const flight = curveFlight(velocity, spin, dt);
        velocity = flight.velocity;
        spin = flight.spin;
        const wall = sweepWalls(position, velocity, dt, state.arena).sort(
          (a, b) => a.time - b.time,
        )[0];
        let travel = wall?.time ?? dt;
        let blocked = false;
        for (const p of state.players) {
          if (p.id === seat || !alive(p)) continue;
          const bat = sweepPaddle(position, velocity, p.id, p.angle, 0, travel, state.arena);
          if (bat) {
            travel = bat.time;
            blocked = true;
          }
        }
        const end = add(position, scale(velocity, travel));
        for (const target of targets) {
          if ((step + 1) * dt >= target.expires) continue;
          const miss = Math.max(
            0,
            segmentDistance(target.position, position, end) - target.radius - ARENA.ballRadius,
          );
          score = Math.max(
            score,
            target.reward / (1 + miss * miss * 6) - step * 0.008 - Math.abs(swipe) * 0.005,
          );
        }
        if (blocked) break;
        position = end;
        if (wall) {
          position = add(position, scale(wall.normal, (wall.separation ?? 0) + 0.001));
          velocity = sub(velocity, scale(wall.normal, 2 * dot(velocity, wall.normal)));
          // Remaining substep deliberately omitted: this is a bounded aim estimate.
        }
      }
      if (score > best.score) best = { angle, swipe, score };
    }
  }
  return best;
}

/** The final brush is a scheduled movement, not a collision-time spin override. */
export function botStrokeAngle(
  plan: { angle: number; swipe: number; contactAt: number },
  now: number,
) {
  return plan.angle - plan.swipe * clamp(plan.contactAt - now, 0, 0.065);
}
