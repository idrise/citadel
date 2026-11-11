import { ARENA, createArena, fortress, type ArenaGeometry, type PlayerCount } from "./arena";
import { fitDefenceLimits } from "./defence-limits";
import { carryPoint, containCircle } from "./polygon";
import { matchOutlines, blendOutline } from "./outline-transition";
import { alive, type MatchState, type ArenaMorph } from "./types";
import { add, angleDifference, length, scale, sub } from "./vector";

/** Survivors keep their IDs, relative rail position and orientation; no roster renumbering. */
export function beginArenaMorph(state: MatchState): void {
  if (!state.eliminations.length) return;
  const survivors = state.players.filter(alive).map((player) => player.id);
  if (survivors.length < 2 || (state.morph?.to.count ?? state.arena.count) === survivors.length)
    return;
  const count = survivors.length as PlayerCount;
  const template = createArena(count, survivors);
  let alignment = 0,
    turn = 0;
  for (const id of survivors) {
    const source = fortress(id, state.arena).anchor,
      target = fortress(id, template).anchor;
    alignment += target.x * source.x + target.y * source.y;
    turn += target.x * source.y - target.y * source.x;
  }
  // Least-squares rotation shares the adjustment across survivors, rather than pinning
  // the first survivor and making the opposite walls sweep the remaining full angle.
  const target = createArena(count, survivors, Math.atan2(turn, alignment));
  // Retain eliminated seat metadata for event consumers/camera; those seats never defend again.
  target.fortresses.push(...state.arena.fortresses.filter((seat) => !survivors.includes(seat.id)));
  const travel = Math.max(
    ...survivors.map((id) =>
      length(sub(fortress(id, target).anchor, fortress(id, state.arena).anchor)),
    ),
  );
  // Reuse the remaining time. Only a large retarget may extend it enough to keep
  // eased fortress translation at or below six units/s (ball speed remains 24).
  const duration = Math.max(
    travel / 4,
    state.morph ? Math.max(0.8, state.morph.duration - state.morph.elapsed) : 2.8,
  );
  state.morph = {
    from: state.arena,
    to: target,
    outline: matchOutlines(state.arena.vertices, target.vertices),
    elapsed: 0,
    duration,
  };
}

function interpolate(morph: ArenaMorph, amount: number): ArenaGeometry {
  const { from, to } = morph;
  return fitDefenceLimits({
    count: to.count,
    vertices: blendOutline(morph.outline, amount),
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
  });
}
export function stepArenaMorph(state: MatchState, dt: number): void {
  const morph = state.morph;
  if (!morph) return;
  const elapsed = Math.min(morph.duration, morph.elapsed + dt);
  const t = elapsed / morph.duration,
    eased = t * t * (3 - 2 * t);
  const before = state.arena;
  const after = elapsed >= morph.duration ? morph.to : interpolate(morph, eased);
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
