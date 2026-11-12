import { ARENA, fortress, type ArenaGeometry } from "../simulation/arena";
import { healthFormation } from "../simulation/health-layout";
import type { MatchState } from "../simulation/types";
import { add, angleDifference, clamp, scale, sub, unit, type Vec2 } from "../simulation/vector";

export const VICTORY_MORPH_SECONDS = 2.8;
export const VICTORY_HOLD_SECONDS = 4.5;
const cross = (a: Vec2, b: Vec2) => a.x * b.y - a.y * b.x;
const mix = (a: Vec2, b: Vec2, t: number): Vec2 => add(scale(a, 1 - t), scale(b, t));
const rotate = (p: Vec2, angle: number): Vec2 => ({
  x: p.x * Math.cos(angle) - p.y * Math.sin(angle),
  y: p.x * Math.sin(angle) + p.y * Math.cos(angle),
});

/** Both outlines are star-shaped about the origin. Include every corner's ray so
 * extra collinear vertices preserve the exact starting and finishing boundaries. */
export function victoryOutlines(source: readonly Vec2[], facing: number) {
  const star = Array.from({ length: 10 }, (_, i) =>
    scale(unit(facing - (i * Math.PI) / 5), i % 2 ? 4.7 : 9.2),
  );
  const angles = [...source, ...star]
    .map((p) => (Math.atan2(p.y, p.x) + Math.PI * 2) % (Math.PI * 2))
    .sort((a, b) => b - a)
    .filter((angle, i, all) => i === 0 || Math.abs(angle - all[i - 1]!) > 1e-9);
  if (angles.length > 1 && Math.PI * 2 - angles[0]! + angles.at(-1)! < 1e-9) angles.pop();
  const intersection = (vertices: readonly Vec2[], angle: number) => {
    const ray = unit(angle);
    let radius = Infinity;
    vertices.forEach((a, index) => {
      const edge = sub(vertices[(index + 1) % vertices.length]!, a);
      const denominator = cross(ray, edge);
      if (Math.abs(denominator) < 1e-10) return;
      const distance = cross(a, edge) / denominator;
      const along = cross(a, ray) / denominator;
      if (distance > 0 && along >= -1e-8 && along <= 1 + 1e-8) radius = Math.min(radius, distance);
    });
    if (!Number.isFinite(radius)) throw new Error("Victory outline must surround the origin");
    return scale(ray, radius);
  };
  return {
    from: angles.map((angle) => intersection(source, angle)),
    to: angles.map((angle) => intersection(star, angle)),
  };
}

/** Presentation only: never changes the arena, health, winner, RNG or tick. */
export function createVictoryMorph(humanSeat: number) {
  let capturedArena: ArenaGeometry | undefined;
  let capturedWinner: number | null = null;
  let outlines: ReturnType<typeof victoryOutlines>;
  let lastProgress = -1;
  let display: ArenaGeometry;
  return {
    update(state: MatchState, elapsed: number, reduced: boolean) {
      if (state.phase !== "finished" || state.winner === null) {
        capturedArena = undefined;
        return null;
      }
      const home = fortress(state.winner, state.arena);
      const viewer = unit(
        Math.atan2(
          fortress(humanSeat, state.arena).anchor.y,
          fortress(humanSeat, state.arena).anchor.x,
        ),
      );
      if (capturedArena !== state.arena || capturedWinner !== state.winner) {
        capturedArena = state.arena;
        capturedWinner = state.winner;
        outlines = victoryOutlines(state.arena.vertices, Math.atan2(viewer.y, viewer.x));
        lastProgress = -1;
      }
      const time = clamp(elapsed / VICTORY_MORPH_SECONDS, 0, 1);
      const progress = reduced ? 1 : time * time * (3 - 2 * time);
      if (lastProgress !== progress) {
        display = {
          ...state.arena,
          vertices: outlines.from.map((p, i) => mix(p, outlines.to[i]!, progress)),
        };
        lastProgress = progress;
      }
      const player = state.players[state.winner]!;
      const targetAngle = Math.atan2(-viewer.y, -viewer.x);
      const targetCentre = scale(viewer, -0.7);
      const formation = healthFormation(
        { x: 0, y: 0 },
        0,
        player.pieces.length,
        Math.max(...player.pieces.map((piece) => piece.radius)),
      );
      const living = formation.filter((_, i) => player.health[i]);
      const centroid = scale(
        living.reduce((sum, position) => add(sum, position), { x: 0, y: 0 }),
        1 / Math.max(1, living.length),
      );
      const targetPaddle = add(scale(viewer, 1.8), scale(viewer, ARENA.railRadius));
      return {
        arena: display,
        winner: player.id,
        progress,
        light: mix(add(home.anchor, scale(unit(home.direction), 2.7)), targetCentre, progress),
        centre: mix(add(home.anchor, scale(unit(home.direction), 0.9)), targetCentre, progress),
        paddle: {
          position: mix(home.anchor, targetPaddle, progress),
          angle: player.angle + angleDifference(targetAngle, player.angle) * progress,
        },
        pieces: player.pieces.map((piece, i) =>
          mix(
            piece.position,
            add(targetCentre, rotate(sub(formation[i]!, centroid), targetAngle)),
            progress,
          ),
        ),
      };
    },
  };
}
