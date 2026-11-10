import { ARENA, fortress } from "./arena";
import { HEALTH_GROWTH_PER_LOSS, healthFormation } from "./health-layout";
import type { PieceBody, PlayerState } from "./types";
import { add, clamp, length, normalise, scale, sub } from "./vector";

export function createPieceBodies(seat: number): PieceBody[] {
  return fortress(seat).pieces.map((position) => ({
    position: { ...position },
    velocity: { x: 0, y: 0 },
    radius: ARENA.pieceRadius,
  }));
}

/** Deterministic damped attraction, with soft separation and a bounded speed. */
export function stepHealth(player: PlayerState, dt: number): void {
  const indices = player.health.flatMap((intact, index) => (intact ? [index] : []));
  if (!indices.length) return;
  const radius = ARENA.pieceRadius * (1 + (ARENA.pieces - indices.length) * HEALTH_GROWTH_PER_LOSS);
  const seat = fortress(player.id);
  const targets = healthFormation(seat.anchor, seat.direction, indices.length, radius);
  const forces = indices.map((index, rank) => {
    const body = player.pieces[index]!;
    return sub(scale(sub(targets[rank]!, body.position), 28), scale(body.velocity, 10));
  });
  for (let first = 0; first < indices.length; first++)
    for (let second = first + 1; second < indices.length; second++) {
      const left = player.pieces[indices[first]!]!,
        right = player.pieces[indices[second]!]!;
      const delta = sub(left.position, right.position);
      const distance = length(delta);
      const overlap = left.radius + right.radius + 0.04 - distance;
      if (overlap <= 0) continue;
      const push = scale(distance > 1e-8 ? normalise(delta) : { x: 1, y: 0 }, overlap * 55);
      forces[first] = add(forces[first]!, push);
      forces[second] = sub(forces[second]!, push);
    }
  indices.forEach((index, rank) => {
    const body = player.pieces[index]!;
    body.radius += (radius - body.radius) * Math.min(1, dt * 6);
    body.velocity = add(body.velocity, scale(forces[rank]!, dt));
    if (length(body.velocity) > 2.2) body.velocity = scale(normalise(body.velocity), 2.2);
    body.position = add(body.position, scale(body.velocity, dt));
    const limit = ARENA.halfSize - body.radius - 0.03;
    const x = clamp(body.position.x, -limit, limit),
      y = clamp(body.position.y, -limit, limit);
    if (x !== body.position.x) body.velocity.x = 0;
    if (y !== body.position.y) body.velocity.y = 0;
    body.position = { x, y };
  });
}

export function visibleTargets(players: readonly PlayerState[]) {
  return players.flatMap((player) =>
    player.pieces.filter((_, index) => player.health[index]).map((body) => body.position),
  );
}
