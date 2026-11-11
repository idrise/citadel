import { ARENA, createArena, fortress, type ArenaGeometry, type PlayerCount } from "./arena";
import { blendPolygon, carryPoint, containCircle } from "./polygon";
import { alive, type MatchState } from "./types";
import { add, angleDifference, scale, sub } from "./vector";

/** Survivors keep their IDs, relative rail position and orientation; no roster renumbering. */
export function beginArenaMorph(state: MatchState): void {
  if (!state.eliminations.length) return;
  const survivors = state.players.filter(alive).map((player) => player.id);
  if (survivors.length < 2 || (state.morph?.to.count ?? state.arena.count) === survivors.length)
    return;
  const first = fortress(survivors[0]!, state.arena);
  const count = survivors.length as PlayerCount;
  const rotation =
    Math.atan2(first.anchor.y, first.anchor.x) - (count === 2 ? Math.PI / 2 : (Math.PI * 3) / 4);
  const target = createArena(count, survivors, rotation);
  // Retain eliminated seat metadata for event consumers/camera; those seats never defend again.
  target.fortresses.push(...state.arena.fortresses.filter((seat) => !survivors.includes(seat.id)));
  const travel = Math.max(
    ...survivors.map((id) => {
      const a = fortress(id, state.arena).anchor,
        b = fortress(id, target).anchor;
      return Math.hypot(a.x - b.x, a.y - b.y);
    }),
  );
  state.morph = { from: state.arena, to: target, elapsed: 0, duration: Math.max(8, travel / 1.0) };
}
function interpolate(from: ArenaGeometry, to: ArenaGeometry, amount: number): ArenaGeometry {
  return {
    count: to.count,
    vertices: blendPolygon(from.vertices, to.vertices, amount),
    fortresses: from.fortresses.map((before) => {
      const after = fortress(before.id, to);
      const turn = angleDifference(after.direction, before.direction);
      return {
        ...before,
        anchor: add(scale(before.anchor, 1 - amount), scale(after.anchor, amount)),
        direction: before.direction + turn * amount,
        halfAngle: before.halfAngle + (after.halfAngle - before.halfAngle) * amount,
      };
    }),
  };
}
export function stepArenaMorph(state: MatchState, dt: number): void {
  const morph = state.morph;
  if (!morph) return;
  const elapsed = Math.min(morph.duration, morph.elapsed + dt);
  const t = elapsed / morph.duration,
    eased = t * t * (3 - 2 * t);
  const before = state.arena;
  const after = elapsed >= morph.duration ? morph.to : interpolate(morph.from, morph.to, eased);
  for (const player of state.players) {
    if (!alive(player)) continue;
    const oldSeat = fortress(player.id, before),
      newSeat = fortress(player.id, after);
    const turn = angleDifference(newSeat.direction, oldSeat.direction);
    const rotate = (point: { x: number; y: number }) => ({
      x: point.x * Math.cos(turn) - point.y * Math.sin(turn),
      y: point.x * Math.sin(turn) + point.y * Math.cos(turn),
    });
    player.angle += turn;
    for (const body of player.pieces) {
      body.position = add(newSeat.anchor, rotate(sub(body.position, oldSeat.anchor)));
      body.position = containCircle(body.position, body.radius + 0.03, after.vertices);
      body.velocity = rotate(body.velocity);
    }
    const bot = state.bots[player.id]!;
    bot.targetAngle += turn;
    if (bot.serveTarget)
      bot.serveTarget = carryPoint(bot.serveTarget, before.vertices, after.vertices);
  }
  for (const ball of state.balls) {
    if (ball.phase !== "active") continue;
    // Carry the floor coordinates, rather than sweeping an advancing wall over a live ball.
    // Flight velocity, spin, clocks and the collision integrator are unchanged.
    ball.position = containCircle(
      carryPoint(ball.position, before.vertices, after.vertices),
      ARENA.ballRadius + 0.0001,
      after.vertices,
    );
    ball.slowSeat = null;
  }
  state.arena = after;
  state.morph = elapsed >= morph.duration ? null : { ...morph, elapsed };
}
