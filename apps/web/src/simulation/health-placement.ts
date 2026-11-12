import { ARENA, fortress, type ArenaGeometry } from "./arena";
import { containCircle, polygonEdges } from "./polygon";
import type { PlayerState } from "./types";
import { add, dot, length, scale, sub, unit, type Vec2 } from "./vector";

export function healthAnchor(seat: number, arena: ArenaGeometry) {
  const home = fortress(seat, arena);
  const inset = Math.max(0, (Math.PI / 4 - home.halfAngle) / (Math.PI / 12)) * 0.6;
  return add(home.anchor, scale(unit(home.direction), inset));
}

/** Test actual occupied circles, not the future spring formation's empty slots. */
export function freeContainerPosition(
  player: PlayerState,
  arena: ArenaGeometry,
  radius: number,
): Vec2 | null {
  const home = fortress(player.id, arena),
    anchor = healthAnchor(player.id, arena);
  const forward = unit(home.direction),
    side = unit(home.direction + Math.PI / 2);
  const edges = polygonEdges(arena.vertices);
  const candidates: Vec2[] = [];
  for (let depth = 1.1; depth <= 3.5; depth += 0.16)
    for (let lateral = -2.5; lateral <= 2.5; lateral += 0.16)
      candidates.push(add(anchor, add(scale(forward, depth), scale(side, lateral))));
  const centre = add(anchor, scale(forward, 2.15));
  candidates.sort((a, b) => length(sub(a, centre)) - length(sub(b, centre)));
  return (
    candidates.find(
      (position) =>
        length(sub(position, home.anchor)) + radius < ARENA.railRadius - 0.35 &&
        edges.every((edge) => dot(sub(position, edge.start), edge.normal) >= radius + 0.035) &&
        player.pieces.every(
          (piece, index) =>
            !player.health[index] ||
            length(sub(position, piece.position)) >= radius + piece.radius + 0.075,
        ),
    ) ?? null
  );
}

/** Hard separation while a collected formation settles; the visible bodies and colliders
 * share these positions. Old authored, pickup-free trajectories retain their original springs. */
export function separateCollectedHealth(player: PlayerState, arena: ArenaGeometry) {
  const living = player.pieces.filter((_, index) => player.health[index]);
  for (let pass = 0; pass < 24; pass++) {
    let penetration = 0;
    for (let i = 0; i < living.length; i++)
      for (let j = i + 1; j < living.length; j++) {
        const a = living[i]!,
          b = living[j]!,
          delta = sub(b.position, a.position);
        const distance = length(delta),
          overlap = a.radius + b.radius + 0.025 - distance;
        if (overlap <= 1e-7) continue;
        penetration = Math.max(penetration, overlap);
        const direction = distance > 1e-9 ? scale(delta, 1 / distance) : unit((i + j) * 2.399963);
        const correction = scale(direction, overlap * 0.501);
        a.position = containCircle(sub(a.position, correction), a.radius + 0.03, arena.vertices);
        b.position = containCircle(add(b.position, correction), b.radius + 0.03, arena.vertices);
      }
    if (penetration < 1e-6) break;
  }
}
