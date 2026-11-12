import { ARENA, fortress } from "./arena";
import { containCircle, carryPoint } from "./polygon";
import { healthFormation } from "./health-layout";
import { sample } from "./random";
import { emit } from "./serving";
import { alive, type BallState, type MatchState } from "./types";
import { scale, unit } from "./vector";

export const SUPPLIES = {
  first: 4,
  interval: 8,
  cutoff: 60,
  fall: 1,
  lifetime: 14,
  radius: 0.48,
  maxPieces: 12,
} as const;

/** Spawn/age only on the playing clock; no late deliveries or suspended-tab catch-up. */
export function stepSupplies(state: MatchState, dt: number) {
  if (state.phase !== "playing") return;
  state.supplies = state.supplies
    .map((drop) => ({ ...drop, age: drop.age + dt }))
    .filter((drop) => drop.age < SUPPLIES.lifetime);
  if (state.elapsed >= SUPPLIES.cutoff) return;
  const scheduled = SUPPLIES.first + state.nextSupplyId * SUPPLIES.interval;
  if (scheduled >= SUPPLIES.cutoff || state.elapsed + 1e-8 < scheduled) return;
  const point = scale(unit(sample(state) * Math.PI * 2), 1.5 + sample(state) * 4);
  const position = containCircle(point, SUPPLIES.radius + 0.1, state.arena.vertices);
  const drop = { id: state.nextSupplyId++, position, age: 0 };
  state.supplies.push(drop);
  emit(state, "supply", position, -1);
}

/** Last actual paddle/serve owns the collection; walls never transfer credit.
 * A departed player's ball cannot resurrect them. Collection doesn't interrupt flight. */
export function collectSupply(state: MatchState, ball: BallState, id: number) {
  const index = state.supplies.findIndex((drop) => drop.id === id && drop.age >= SUPPLIES.fall);
  const player = state.players[ball.striker ?? ball.seat];
  if (
    index < 0 ||
    !player ||
    !alive(player) ||
    player.health.filter(Boolean).length >= SUPPLIES.maxPieces
  )
    return false;
  const drop = state.supplies[index]!;
  let piece = player.health.findIndex((intact) => !intact);
  if (piece < 0) piece = player.health.length;
  const seat = fortress(player.id, state.arena);
  const count = player.health.filter(Boolean).length + 1;
  const target = healthFormation(seat.anchor, seat.direction, count, ARENA.pieceRadius).at(-1)!;
  const position = containCircle(target, ARENA.pieceRadius + 0.03, state.arena.vertices);
  player.health[piece] = true;
  player.pieces[piece] = { position, radius: ARENA.pieceRadius, velocity: { x: 0, y: 0 } };
  state.supplies.splice(index, 1);
  return emit(state, "collection", drop.position, player.id, piece, {
    ballId: ball.id,
    returnTo: position,
    radius: ARENA.pieceRadius,
  });
}

export function carrySupplies(
  state: MatchState,
  before: MatchState["arena"],
  after: MatchState["arena"],
) {
  state.supplies = state.supplies.map((drop) => ({
    ...drop,
    position: containCircle(
      carryPoint(drop.position, before.vertices, after.vertices),
      SUPPLIES.radius + 0.1,
      after.vertices,
    ),
  }));
}
