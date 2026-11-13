import { ARENA, fortress, railPosition } from "./arena";
import { aimServeAt, serveDirection } from "./aim";
import { botTargets } from "./bot-shot";
import { sweepPaddle, sweepWalls } from "./collision";
import { SUPPLIES } from "./supplies";
import { alive, type MatchState } from "./types";
import { dot, length, scale, sub, type Vec2 } from "./vector";
export interface ServePlan {
  readonly ballId: number;
  readonly roster: number;
  readonly targetSeat: number | null;
  readonly piece: number | null;
  readonly supplyId: number | null;
  readonly open: boolean;
  readonly reconsiderAt: number;
}
export function servePlanTarget(state: MatchState, plan: ServePlan): Vec2 | null {
  if (plan.supplyId !== null)
    return (
      state.supplies.find(
        (drop) =>
          drop.id === plan.supplyId && drop.age >= SUPPLIES.fall && drop.age < SUPPLIES.lifetime,
      )?.position ?? null
    );
  const player = state.players[plan.targetSeat ?? -1];
  return player && alive(player) && plan.piece !== null && player.health[plan.piece]
    ? player.pieces[plan.piece]!.position
    : null;
}
/** At most two supplies and three nearby banks. Ordinary visible poses only; no future inputs,
 * match writes or RNG. The caller caches this bounded line-of-sight search between decisions. */
export function planBotServe(state: MatchState, seat: number, precision = 1): ServePlan | null {
  const ball = state.balls.find((b) => b.phase === "ready" && b.seat === seat),
    player = state.players[seat];
  if (!ball || !player || !alive(player)) return null;
  const targets = botTargets(state, seat, ball.position);
  const candidates = [
    ...targets.filter((t) => t.supplyId !== undefined).slice(0, 2),
    ...targets
      .filter((t) => t.targetSeat !== undefined)
      .toSorted(
        (a, b) => length(sub(a.position, ball.position)) - length(sub(b.position, ball.position)),
      )
      .slice(0, 3),
  ];
  let best: ServePlan | null = null,
    bestScore = -Infinity;
  for (const target of candidates) {
    const angle = aimServeAt(seat, target.position, state.arena),
      origin = railPosition(seat, angle, ARENA.railRadius + 0.4, state.arena),
      direction = serveDirection(seat, angle, state.arena);
    const travel = sub(target.position, origin),
      along = dot(travel, direction),
      miss = length(sub(travel, scale(direction, along))),
      radius = target.radius + ARENA.ballRadius;
    if (
      along <= 0 ||
      miss > radius ||
      along / (state.difficulty?.ballSpeed ?? 24) >= target.expires
    )
      continue;
    const distance = Math.max(0, along - Math.sqrt(Math.max(0, radius * radius - miss * miss)));
    if (sweepWalls(origin, direction, distance, state.arena).length) continue;
    const blocked = state.players.some(
      (other) =>
        other.id !== seat &&
        alive(other) &&
        sweepPaddle(origin, direction, other.id, other.angle, 0, distance, state.arena) !== null,
    );
    const victim = state.players[target.targetSeat ?? -1];
    let pressure = 0;
    if (victim) {
      const home = fortress(victim.id, state.arena).anchor;
      pressure = state.balls.some(
        (other) =>
          other.phase === "active" &&
          length(sub(home, other.position)) < 7 &&
          dot(sub(home, other.position), other.velocity) > 0,
      )
        ? 0.75
        : 0;
    }
    const score =
      target.reward +
      (blocked ? -3 : 6) +
      (victim?.health.filter(Boolean).length === 1 ? 1.5 : 0) +
      pressure -
      along * 0.01;
    if (score > bestScore) {
      bestScore = score;
      best = {
        ballId: ball.id,
        roster: state.arena.count,
        targetSeat: target.targetSeat ?? null,
        piece: target.piece ?? null,
        supplyId: target.supplyId ?? null,
        open: !blocked,
        reconsiderAt:
          state.elapsed +
          0.1 +
          0.2 * (1 - Math.max(0, Math.min(1, precision))) +
          ((seat * 0.618) % 1) * 0.025,
      };
    }
  }
  return best;
}
