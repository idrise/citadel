import { FIXED_DT } from "./arena";
import { advanceBall } from "./ball";
import { sweepCircle, sweepPaddle, sweepWalls, type Contact } from "./collision";
import { alive, DEFAULT_OPTIONS, type BallState, type MatchState } from "./types";
import { ARENA } from "./arena";
import { add, dot, normalise, scale, sub, type Vec2 } from "./vector";

export const PREVIEW_HORIZON = 0.45;
export interface ReturnPreview {
  ballId: number;
  time: number;
  contact: Vec2;
  outgoing: Vec2;
}

/** Conditional on all bats/pieces staying at their current poses. Nothing writes into the live match. */
export function predictReturn(
  state: MatchState,
  seat: number,
  slowdown: boolean,
): ReturnPreview | null {
  const defender = state.players[seat];
  if (state.phase !== "playing" || !defender || !alive(defender)) return null;
  const angles = state.players.map((player) => player.angle);
  const pieces = state.players.map((player) => player.pieces.map((body) => body.position));
  const options = { ...DEFAULT_OPTIONS, humanSeat: seat, slowdown };
  const candidates: ReturnPreview[] = [];
  for (const source of state.balls) {
    if (source.phase !== "active") continue;
    const ball: BallState = {
      ...source,
      position: { ...source.position },
      velocity: { ...source.velocity },
    };
    const trial: MatchState = {
      ...state,
      balls: [ball],
      events: [],
      stats: { ...state.stats },
      players: state.players.map((player) => ({ ...player, health: [...player.health] })),
    };
    for (let step = 0; step < Math.floor(PREVIEW_HORIZON / FIXED_DT); step++) {
      advanceBall(trial, ball, angles, FIXED_DT, options, pieces, true);
      const event = trial.events[0];
      if (!event) continue;
      if (event.type === "paddle" && event.seat === seat)
        candidates.push({
          ballId: ball.id,
          time: (step + 1) * FIXED_DT,
          contact: event.position,
          outgoing: normalise(ball.velocity),
        });
      break;
    }
  }
  return candidates.sort((a, b) => a.time - b.time || a.ballId - b.ballId)[0] ?? null;
}

interface GuideContact extends Contact {
  wall: boolean;
}

function guideContact(
  state: MatchState,
  start: Vec2,
  direction: Vec2,
  distance: number,
  ignoreSeat: number,
): GuideContact | undefined {
  const contacts: GuideContact[] = sweepWalls(start, direction, distance).map((hit) => ({
    ...hit,
    wall: true,
  }));
  for (const player of state.players) {
    if (!alive(player)) continue;
    if (player.id !== ignoreSeat) {
      const hit = sweepPaddle(start, direction, player.id, player.angle, 0, distance);
      if (hit) contacts.push({ ...hit, wall: false });
    }
    for (let piece = 0; piece < player.pieces.length; piece++) {
      if (!player.health[piece]) continue;
      const body = player.pieces[piece]!;
      const hit = sweepCircle(
        start,
        direction,
        body.position,
        body.radius + ARENA.ballRadius,
        distance,
      );
      if (hit) contacts.push({ ...hit, wall: false });
    }
  }
  return contacts.sort((a, b) => a.time - b.time || Number(a.wall) - Number(b.wall))[0];
}

/** At most one wall bank, truncated by another bat or actual surviving health piece. */
export function traceAimGuide(
  state: MatchState,
  start: Vec2,
  direction: Vec2,
  distance: number,
  seat: number,
): Vec2[] {
  const first = guideContact(state, start, direction, distance, seat);
  const bend = add(start, scale(direction, first?.time ?? distance));
  if (!first?.wall) return [start, bend, bend];
  const reflected = sub(direction, scale(first.normal, 2 * dot(direction, first.normal)));
  const nextStart = add(bend, scale(first.normal, 0.0001));
  const remaining = Math.min(3, distance - first.time);
  const second = guideContact(state, nextStart, reflected, remaining, -1);
  return [start, bend, add(nextStart, scale(reflected, second?.time ?? remaining))];
}
