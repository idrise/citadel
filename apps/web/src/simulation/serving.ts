import { serveDirection } from "./aim";
import { ARENA, fortress, railPosition } from "./arena";
import { sample } from "./random";
import {
  alive,
  type BallState,
  type GameEvent,
  type MatchState,
  type MatchOptions,
  type ImpactDetails,
} from "./types";
import { scale, type Vec2 } from "./vector";

export function emit(
  state: MatchState,
  type: GameEvent["type"],
  position: Vec2,
  seat: number,
  piece: number | null = null,
  details: Pick<GameEvent, "ballId" | "radius" | "returnTo" | "impact"> = {},
): GameEvent {
  const event: GameEvent = {
    id: state.nextEventId++,
    tick: state.tick,
    type,
    position: { ...position },
    seat,
    piece,
    ...details,
  };
  state.events.push(event);
  return event;
}
export function readyBall(state: MatchState, seat: number, id = 0): BallState {
  const player = state.players[seat];
  const angle = player?.angle ?? fortress(seat, state.arena).direction;
  return {
    id,
    striker: seat,
    phase: "ready",
    seat,
    age: 0,
    position: railPosition(seat, angle, ARENA.railRadius + 0.4, state.arena),
    velocity: { x: 0, y: 0 },
    slowSeat: null,
    spin: 0,
  };
}
export function launchBall(state: MatchState, ball: BallState, options: MatchOptions): void {
  const angle = state.players[ball.seat]?.angle ?? fortress(ball.seat, state.arena).direction;
  ball.velocity = scale(serveDirection(ball.seat, angle, state.arena), options.ballSpeed);
  ball.phase = "active";
  ball.striker = ball.seat;
  ball.slowSeat = null;
  ball.spin = 0;
  emit(state, "launch", ball.position, ball.seat, null, { ballId: ball.id });
}
export function damagePiece(
  state: MatchState,
  ball: BallState,
  seat: number,
  piece: number,
  impact?: ImpactDetails,
): void {
  const player = state.players[seat];
  if (!player?.health[piece]) return;
  player.health[piece] = false;
  state.stats.damage++;
  const damage = emit(state, "damage", player.pieces[piece]!.position, seat, piece, {
    ballId: ball.id,
    radius: player.pieces[piece]!.radius,
    ...(impact ? { impact } : {}),
  });
  if (!alive(player)) {
    state.eliminations.push({ seat, elapsed: state.elapsed });
    emit(state, "elimination", ball.position, seat, null, { ballId: ball.id });
  }
  const survivors = state.players.filter(alive);
  if (survivors.length <= 1) {
    state.phase = "finished";
    state.winner = survivors[0]?.id ?? null;
    state.balls = [];
    state.supplies = [];
    emit(state, "victory", ball.position, state.winner ?? -1, null, { ballId: ball.id });
    return;
  }
  // Provisional, seeded fallback only for an eliminating hit; otherwise revenge serve.
  const recipient = alive(player)
    ? seat
    : (survivors[Math.floor(sample(state) * survivors.length)]?.id ?? survivors[0]!.id);
  Object.assign(ball, readyBall(state, recipient, ball.id));
  damage.returnTo = { ...ball.position };
  for (const pending of state.balls) {
    if (pending.phase === "ready" && !alive(state.players[pending.seat]!)) {
      const target = survivors[Math.floor(sample(state) * survivors.length)]!.id;
      Object.assign(pending, readyBall(state, target, pending.id));
    }
  }
}
