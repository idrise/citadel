import { ARENA, fortress, SQUARE_ARENA, type ArenaGeometry } from "./arena";
import { HEALTH_GROWTH_PER_LOSS, healthFormation } from "./health-layout";
import type { PieceBody, PlayerState } from "./types";
import { containCircle } from "./polygon";
import { add, length, normalise, scale, sub } from "./vector";

export function createPieceBodies(seat: number, arena: ArenaGeometry = SQUARE_ARENA): PieceBody[] {
  return fortress(seat, arena).pieces.map((position) => ({
    position: { ...position },
    velocity: { x: 0, y: 0 },
    radius: ARENA.pieceRadius,
  }));
}

/** Deterministic damped attraction, with soft separation and a bounded speed. */
export function stepHealth(
  player: PlayerState,
  dt: number,
  arena: ArenaGeometry = SQUARE_ARENA,
): void {
  const indices = player.health.flatMap((intact, index) => (intact ? [index] : []));
  if (!indices.length) return;
  const radius = ARENA.pieceRadius * (1 + (ARENA.pieces - indices.length) * HEALTH_GROWTH_PER_LOSS);
  const seat = fortress(player.id, arena);
  const inset = Math.max(0, (Math.PI / 4 - seat.halfAngle) / (Math.PI / 12)) * 0.6;
  const anchor = add(
    seat.anchor,
    scale({ x: Math.cos(seat.direction), y: Math.sin(seat.direction) }, inset),
  );
  const targets = healthFormation(anchor, seat.direction, indices.length, radius);
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
    const contained = containCircle(body.position, body.radius + 0.03, arena.vertices);
    if (Math.abs(contained.x - body.position.x) > 1e-9) body.velocity.x = 0;
    if (Math.abs(contained.y - body.position.y) > 1e-9) body.velocity.y = 0;
    body.position = contained;
  });
}

export function visibleTargets(players: readonly PlayerState[]) {
  return players.flatMap((player) =>
    player.pieces.filter((_, index) => player.health[index]).map((body) => body.position),
  );
}
