import { FIXED_DT, fortress } from "./arena";
import { advanceBall } from "./ball";
import { sweepCircle, sweepPaddle, sweepWalls, type Contact } from "./collision";
import {
  alive,
  DEFAULT_OPTIONS,
  type BallState,
  type MatchOptions,
  type MatchState,
} from "./types";
import { ARENA } from "./arena";
import { rememberSwipe } from "./flight";
import { add, dot, length, normalise, scale, sub, type Vec2 } from "./vector";

export const PREVIEW_HORIZON = 0.45;
export const PREVIEW_ACTIVATION_RADIUS = ARENA.railRadius + 4;
export const OUTGOING_HORIZON = 0.9;
export interface ReturnPreview {
  ballId: number;
  time: number;
  contact: Vec2;
  outgoing: Vec2;
  points: Vec2[];
  impacts: Vec2[];
}

/** Project other active balls as well when pressure relief depends on their arrival times. */
function forecastStep(
  trial: MatchState,
  tracked: BallState,
  angles: number[],
  options: MatchOptions,
  pieces: Vec2[][],
) {
  for (const player of trial.players) player.swipe = rememberSwipe(player.swipe, 0, FIXED_DT);
  if (!options.slowdown)
    return advanceBall(trial, tracked, angles, FIXED_DT, options, pieces, true);
  let impact: ReturnType<typeof advanceBall>;
  for (const ball of trial.balls) {
    if (ball.phase !== "active") continue;
    const hit = advanceBall(trial, ball, angles, FIXED_DT, options, pieces, true);
    if (ball.id === tracked.id) impact = hit;
    else if (hit?.type === "piece") ball.phase = "ready"; // No hypothetical damage or future serves.
  }
  return impact;
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
  let selected: { preview: ReturnPreview; trial: MatchState; ball: BallState } | null = null;
  for (const source of state.balls) {
    if (
      source.phase !== "active" ||
      length(sub(source.position, fortress(seat, state.arena).anchor)) > PREVIEW_ACTIVATION_RADIUS
    )
      continue;
    const ball: BallState = {
      ...source,
      position: { ...source.position },
      velocity: { ...source.velocity },
    };
    const trial: MatchState = {
      ...state,
      balls: state.balls.map((other) =>
        other.id === source.id
          ? ball
          : { ...other, position: { ...other.position }, velocity: { ...other.velocity } },
      ),
      events: [],
      stats: { ...state.stats },
      players: state.players.map((player) => ({ ...player, health: [...player.health] })),
    };
    const points: Vec2[] = [{ ...ball.position }];
    for (let step = 0; step < Math.floor(PREVIEW_HORIZON / FIXED_DT); step++) {
      const hit = forecastStep(trial, ball, angles, options, pieces);
      points.push(hit?.position ?? { ...ball.position });
      if (!hit) continue;
      if (hit.type === "paddle" && hit.seat === seat) {
        const preview: ReturnPreview = {
          ballId: ball.id,
          time: step * FIXED_DT + hit.time,
          contact: hit.position,
          outgoing: normalise(ball.velocity),
          points,
          impacts: [hit.position],
        };
        if (
          !selected ||
          preview.time < selected.preview.time ||
          (preview.time === selected.preview.time && ball.id < selected.ball.id)
        )
          selected = { preview, trial, ball };
      }
      break;
    }
  }
  if (!selected) return null;
  const { preview, trial, ball } = selected;
  let walls = 0;
  for (let step = 0; step < Math.floor(OUTGOING_HORIZON / FIXED_DT); step++) {
    trial.events = [];
    const hit = forecastStep(trial, ball, angles, options, pieces);
    preview.points.push(hit?.position ?? { ...ball.position });
    if (!hit) continue;
    preview.impacts.push(hit.position);
    // Show one bank, then end at the next collision. Frozen actors are conditional, not a promise.
    if (hit.type !== "wall" || ++walls > 1) break;
  }
  return preview;
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
  const contacts: GuideContact[] = sweepWalls(start, direction, distance, state.arena).map(
    (hit) => ({
      ...hit,
      wall: true,
    }),
  );
  for (const player of state.players) {
    if (!alive(player)) continue;
    if (player.id !== ignoreSeat) {
      const hit = sweepPaddle(start, direction, player.id, player.angle, 0, distance, state.arena);
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
