import { ARENA, fortress, railPosition } from "./arena";
import { sample } from "./random";
import { alive, type BallState, type GameEvent, type MatchState, type MatchOptions } from "./types";
import { scale, unit, type Vec2 } from "./vector";

export function emit(
  state: MatchState,
  type: GameEvent["type"],
  position: Vec2,
  seat: number,
  piece: number | null = null,
): void {
  state.events.push({
    id: state.nextEventId++,
    tick: state.tick,
    type,
    position: { ...position },
    seat,
    piece,
  });
}
export function readyBall(state: MatchState, seat: number, id = 0): BallState {
  const player = state.players[seat];
  const angle = player?.angle ?? fortress(seat).direction;
  return {
    id,
    phase: "ready",
    seat,
    age: 0,
    position: railPosition(seat, angle, ARENA.railRadius + 0.4),
    velocity: { x: 0, y: 0 },
    slowSeat: null,
  };
}
export function launchBall(state: MatchState, ball: BallState, options: MatchOptions): void {
  const angle = state.players[ball.seat]?.angle ?? fortress(ball.seat).direction;
  ball.velocity = scale(unit(angle + (sample(state) - 0.5) * 0.04), options.ballSpeed);
  ball.phase = "active";
  ball.slowSeat = null;
  emit(state, "launch", ball.position, ball.seat);
}
export function damagePiece(state: MatchState, ball: BallState, seat: number, piece: number): void {
  const player = state.players[seat];
  if (!player?.health[piece]) return;
  player.health[piece] = false;
  state.stats.damage++;
  emit(state, "damage", ball.position, seat, piece);
  if (!alive(player)) emit(state, "elimination", ball.position, seat);
  const survivors = state.players.filter(alive);
  if (survivors.length <= 1) {
    state.phase = "finished";
    state.winner = survivors[0]?.id ?? null;
    state.balls = [];
    emit(state, "victory", ball.position, state.winner ?? -1);
    return;
  }
  // Provisional, seeded fallback only for an eliminating hit; otherwise revenge serve.
  const recipient = alive(player)
    ? seat
    : (survivors[Math.floor(sample(state) * survivors.length)]?.id ?? survivors[0]!.id);
  Object.assign(ball, readyBall(state, recipient, ball.id));
  for (const pending of state.balls) {
    if (pending.phase === "ready" && !alive(state.players[pending.seat]!)) {
      const target = survivors[Math.floor(sample(state) * survivors.length)]!.id;
      Object.assign(pending, readyBall(state, target, pending.id));
    }
  }
}
