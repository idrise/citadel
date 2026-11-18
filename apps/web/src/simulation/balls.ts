import {
  beginBallFlight,
  findBallImpact,
  MAX_BALL_IMPACTS,
  resolveBallImpact,
  type BallFlight,
  type Impact,
} from "./ball";
import { resolveBallContact, sweepBalls } from "./ball-contact";
import type { Contact } from "./collision";
import { emit } from "./serving";
import { approachSlowdown } from "./slowdown";
import type { BallState, MatchOptions, MatchState } from "./types";
import { add, dot, length, normalise, scale, sub, type Vec2 } from "./vector";

type Collision =
  | { time: number; flight: BallFlight; hit: Impact; other?: undefined }
  | { time: number; flight: BallFlight; hit: Contact; other: BallFlight };
const rank = { paddle: 0, piece: 1, wall: 2, pickup: 3 };
const order = (hit: Collision) => (hit.other ? 4 : rank[hit.hit.type]);

/** All live flights share a clock. Re-query after every contact, so a wall, paddle,
 * score or another ball can invalidate a predicted pair hit before it occurs.
 * Exact ties use world-contact rank then stable ball IDs. Ready balls never collide. */
export function advanceBalls(
  state: MatchState,
  balls: BallState[],
  previousAngles: number[],
  dt: number,
  options: MatchOptions,
  previousPieces: Vec2[][],
) {
  if (state.phase !== "playing" || dt <= 0) return;
  const flights = balls
    .filter((b) => b.phase === "active")
    .sort((a, b) => a.id - b.id)
    .map((b) => beginBallFlight(b, dt, options));
  const paired = new Set<BallFlight>();
  let elapsed = 0,
    overlapRepairs = 0;
  while (elapsed < dt - 1e-7 && state.phase === "playing") {
    const live = flights.filter((f) => f.ball.phase === "active" && f.impacts < MAX_BALL_IMPACTS);
    if (!live.length) break;
    const remaining = dt - elapsed;
    const velocities = new Map<BallFlight, { velocity: Vec2; factor: number }>();
    let next: Collision | undefined;
    const consider = (candidate: Collision) => {
      if (
        !next ||
        candidate.time < next.time ||
        (candidate.time === next.time &&
          (order(candidate) < order(next) ||
            (order(candidate) === order(next) &&
              (candidate.flight.ball.id < next.flight.ball.id ||
                (candidate.flight.ball.id === next.flight.ball.id &&
                  (candidate.other?.ball.id ?? -1) < (next.other?.ball.id ?? -1))))))
      )
        next = candidate;
    };
    for (const flight of live) {
      const { seat, factor } = approachSlowdown(state, flight.ball, options.slowdown);
      flight.ball.slowSeat = seat;
      const velocity = scale(flight.ball.velocity, factor);
      velocities.set(flight, { velocity, factor });
      const hit = findBallImpact(
        state,
        flight,
        velocity,
        previousAngles,
        dt,
        elapsed,
        remaining,
        previousPieces,
      );
      if (hit) consider({ time: hit.time, flight, hit });
    }
    for (let i = 0; i < live.length; i++) {
      const a = live[i]!;
      for (let j = i + 1; j < live.length; j++) {
        const b = live[j]!;
        const hit = sweepBalls(
          a.ball,
          b.ball,
          velocities.get(a)!.velocity,
          velocities.get(b)!.velocity,
          remaining,
        );
        if (hit) consider({ time: hit.time, flight: a, hit, other: b });
      }
    }
    const travel = Math.min(remaining, next?.time ?? remaining);
    for (const flight of live)
      flight.ball.position = add(
        flight.ball.position,
        scale(velocities.get(flight)!.velocity, travel),
      );
    elapsed += travel;
    if (!next) break;
    const { flight, hit, other } = next;
    if (other) {
      const incoming = { ...flight.ball.velocity };
      const position = scale(add(flight.ball.position, other.ball.position), 0.5);
      if (
        resolveBallContact(
          flight.ball,
          other.ball,
          hit.normal,
          velocities.get(flight)!.factor,
          velocities.get(other)!.factor,
        )
      ) {
        flight.departure = hit.normal;
        other.departure = scale(hit.normal, -1);
        paired.add(flight);
        paired.add(other);
        flight.impacts++;
        other.impacts++;
        emit(state, "ball", position, -1, null, {
          ballId: flight.ball.id,
          otherBallId: other.ball.id,
          impact: {
            time: elapsed,
            normal: hit.normal,
            incoming,
            outgoing: { ...flight.ball.velocity },
            spin: flight.ball.spin ?? 0,
          },
        });
      } else {
        // Repair the whole queue together. Resolving only the first stable-ID
        // pair repeatedly makes a long co-moving chain converge very slowly.
        for (let i = 0; i < live.length; i++)
          for (let j = i + 1; j < live.length; j++) {
            const a = live[i]!,
              b = live[j]!;
            const va = velocities.get(a)!,
              vb = velocities.get(b)!;
            const overlap = sweepBalls(a.ball, b.ball, va.velocity, vb.velocity, 0);
            if (overlap && dot(sub(va.velocity, vb.velocity), overlap.normal) >= -1e-8)
              resolveBallContact(a.ball, b.ball, overlap.normal, va.factor, vb.factor);
          }
        if (++overlapRepairs >= flights.length * 32) {
          state.stats.collisionCaps++;
          break;
        }
      }
    } else {
      flight.impacts++;
      resolveBallImpact(state, flight, hit, previousAngles, dt, elapsed, previousPieces);
    }
    if (elapsed < dt - 1e-7 && state.phase === "playing")
      for (const item of other ? [flight, other] : [flight])
        if (item.ball.phase === "active" && item.impacts === MAX_BALL_IMPACTS)
          state.stats.collisionCaps++;
  }
  for (const flight of paired)
    if (flight.ball.phase === "active")
      flight.ball.velocity = scale(
        normalise(length(flight.ball.velocity) > 1e-8 ? flight.ball.velocity : flight.departure),
        flight.speed,
      );
}
