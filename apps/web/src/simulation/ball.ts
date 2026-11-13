import { advanceRally } from "./rally";
import { collectSupply, SUPPLIES } from "./supplies";
import { ARENA } from "./arena";
import { paddleReturn, sweepCircle, sweepPaddle, sweepWalls, type Contact } from "./collision";
import { damagePiece, emit } from "./serving";
import { alive, type BallState, type MatchOptions, type MatchState } from "./types";
import { add, scale, sub, type Vec2 } from "./vector";
import { approachSlowdown } from "./slowdown";
import { contactSwipe, curveFlight, spinBounce, spinReturn, swipeCurve } from "./flight";

interface Impact extends Contact {
  type: "paddle" | "piece" | "wall" | "pickup";
  seat: number;
  piece: number;
  offset: number;
}
export interface BallImpact extends Impact {
  position: Vec2;
}

const rank = { paddle: 0, piece: 1, wall: 2, pickup: 3 };

/** Gameplay resolves a full tick with stable ties. Queries stop at the first impact, without damage/serve side effects. */
export function advanceBall(
  state: MatchState,
  ball: BallState,
  previousAngles: number[],
  dt: number,
  options: MatchOptions,
  previousPieces: Vec2[][],
  stopAtFirstImpact = false,
): BallImpact | undefined {
  if (state.phase === "playing")
    advanceRally(ball, options.ballSpeed, dt, options.rallyAcceleration === true);
  const flight = curveFlight(ball.velocity, ball.spin, dt);
  ball.velocity = flight.velocity;
  ball.spin = flight.spin;
  let remaining = dt;
  let elapsed = 0;
  let impacts = 0;
  const struckPaddles = new Set<number>();
  const passedSupplies = new Set<number>();
  while (remaining > 1e-7 && impacts < 8 && ball.phase === "active" && state.phase === "playing") {
    const { seat, factor } = approachSlowdown(state, ball, options.slowdown);
    ball.slowSeat = seat;
    const velocity = scale(ball.velocity, factor);
    const contacts: Impact[] = sweepWalls(ball.position, velocity, remaining, state.arena).map(
      (contact) => ({
        ...contact,
        type: "wall",
        seat: -1,
        piece: -1,
        offset: 0,
      }),
    );
    for (const player of state.players) {
      if (!alive(player)) continue;
      const before = previousAngles[player.id] ?? player.angle;
      const angularVelocity = (player.angle - before) / dt;
      const paddle = struckPaddles.has(player.id)
        ? null
        : sweepPaddle(
            ball.position,
            velocity,
            player.id,
            before + angularVelocity * elapsed,
            angularVelocity,
            remaining,
            state.arena,
          );
      if (paddle) contacts.push({ ...paddle, type: "paddle", seat: player.id, piece: -1 });
      player.pieces.forEach((body, piece) => {
        if (!player.health[piece]) return;
        const beforePiece = previousPieces[player.id]?.[piece] ?? body.position;
        const pieceVelocity = scale(sub(body.position, beforePiece), 1 / dt);
        const centre = add(beforePiece, scale(pieceVelocity, elapsed));
        const contact = sweepCircle(
          ball.position,
          sub(velocity, pieceVelocity),
          centre,
          body.radius + ARENA.ballRadius,
          remaining,
        );
        if (contact)
          contacts.push({ ...contact, type: "piece", seat: player.id, piece, offset: 0 });
      });
    }
    for (const drop of state.supplies) {
      if (drop.age < SUPPLIES.fall || passedSupplies.has(drop.id)) continue;
      const contact = sweepCircle(
        ball.position,
        velocity,
        drop.position,
        SUPPLIES.radius + ARENA.ballRadius,
        remaining,
      );
      if (contact)
        contacts.push({
          ...contact,
          type: "pickup",
          seat: ball.striker ?? ball.seat,
          piece: drop.id,
          offset: 0,
        });
    }
    contacts.sort(
      (a, b) =>
        a.time - b.time || rank[a.type] - rank[b.type] || a.seat - b.seat || a.piece - b.piece,
    );
    const hit = contacts[0];
    const travel = hit?.time ?? remaining;
    ball.position = add(ball.position, scale(velocity, travel));
    elapsed += travel;
    remaining -= travel;
    if (!hit) return;
    impacts++;
    const report = stopAtFirstImpact ? { ...hit, position: { ...ball.position } } : undefined;
    const incoming = { ...ball.velocity };
    if (hit.type === "pickup") {
      passedSupplies.add(hit.piece);
      const rebound = spinBounce(ball.velocity, hit.normal, ball.spin);
      ball.velocity = rebound.velocity;
      ball.spin = rebound.spin;
      ball.position = add(ball.position, scale(hit.normal, (hit.separation ?? 0) + 0.0001));
      if (stopAtFirstImpact) return report;
      const collection = collectSupply(state, ball, hit.piece);
      const impact = {
        time: elapsed,
        normal: { ...hit.normal },
        incoming,
        outgoing: { ...ball.velocity },
        spin: ball.spin ?? 0,
      };
      if (collection) collection.impact = impact;
      else emit(state, "wall", ball.position, -1, null, { ballId: ball.id, impact });
      if (collection && collection.piece !== null)
        previousPieces[collection.seat]![collection.piece] = { ...collection.returnTo! };
      continue;
    }
    if (hit.type === "piece") {
      if (stopAtFirstImpact) return report;
      damagePiece(state, ball, hit.seat, hit.piece, {
        time: elapsed,
        normal: { ...hit.normal },
        incoming,
        outgoing: { x: 0, y: 0 },
        spin: ball.spin ?? 0,
      });
      return;
    }
    if (hit.type === "paddle") {
      ball.striker = hit.seat;
      const angularVelocity =
        (state.players[hit.seat]!.angle -
          (previousAngles[hit.seat] ?? state.players[hit.seat]!.angle)) /
        dt;
      ball.velocity = spinReturn(
        paddleReturn(ball.velocity, hit.offset, hit.normal),
        hit.normal,
        ball.spin,
      );
      ball.spin = swipeCurve(
        contactSwipe(state.players[hit.seat]!.swipe, angularVelocity),
        incoming,
        hit.normal,
      );
      ball.slowSeat = null;
      struckPaddles.add(hit.seat);
      state.stats.paddleHits++;
      emit(state, "paddle", ball.position, hit.seat, null, {
        ballId: ball.id,
        impact: {
          time: elapsed,
          normal: { ...hit.normal },
          incoming,
          outgoing: { ...ball.velocity },
          spin: ball.spin ?? 0,
        },
      });
    } else {
      const rebound = spinBounce(ball.velocity, hit.normal, ball.spin);
      ball.velocity = rebound.velocity;
      ball.spin = rebound.spin;
      emit(state, "wall", ball.position, -1, null, {
        ballId: ball.id,
        impact: {
          time: elapsed,
          normal: { ...hit.normal },
          incoming,
          outgoing: { ...ball.velocity },
          spin: ball.spin ?? 0,
        },
      });
    }
    ball.position = add(ball.position, scale(hit.normal, (hit.separation ?? 0) + 0.0001));
    if (stopAtFirstImpact) return report;
  }
  if (remaining > 1e-7 && ball.phase === "active" && state.phase === "playing")
    state.stats.collisionCaps++;
}
