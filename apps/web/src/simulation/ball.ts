import { ARENA, FORTRESSES } from "./arena";
import { paddleReturn, sweepCircle, sweepPaddle, sweepWalls, type Contact } from "./collision";
import { damagePiece, emit } from "./serving";
import { alive, type BallState, type MatchOptions, type MatchState } from "./types";
import { add, angleDifference, angleOf, dot, length, scale, sub, type Vec2 } from "./vector";

interface Impact extends Contact {
  type: "paddle" | "piece" | "wall";
  seat: number;
  piece: number;
  offset: number;
}
const rank = { paddle: 0, piece: 1, wall: 2 };

function speedFactor(state: MatchState, ball: BallState, enabled: boolean): number {
  if (!enabled) {
    ball.slowSeat = null;
    return 1;
  }
  const current = ball.slowSeat;
  ball.slowSeat = null;
  for (const player of state.players) {
    if (!alive(player)) continue;
    const anchor = FORTRESSES[player.id]!.anchor;
    const delta = sub(ball.position, anchor);
    const distance = length(delta);
    const nearAngle =
      Math.abs(angleDifference(angleOf(delta), player.angle)) < ARENA.paddleHalfAngle + 0.18;
    const outerLimit = ARENA.railRadius + (current === player.id ? 2.6 : 2.1);
    if (
      nearAngle &&
      distance > ARENA.railRadius + 0.3 &&
      distance < outerLimit &&
      dot(delta, ball.velocity) < 0
    ) {
      ball.slowSeat = player.id;
      return 0.55;
    }
  }
  return 1;
}

/** One ball, earliest impact first; stable type/seat/piece tie order. */
export function advanceBall(
  state: MatchState,
  ball: BallState,
  previousAngles: number[],
  dt: number,
  options: MatchOptions,
  previousPieces: Vec2[][],
): void {
  let remaining = dt;
  let elapsed = 0;
  let impacts = 0;
  const struckPaddles = new Set<number>();
  while (remaining > 1e-7 && impacts < 8 && ball.phase === "active" && state.phase === "playing") {
    const factor = speedFactor(state, ball, options.slowdown);
    const velocity = scale(ball.velocity, factor);
    const contacts: Impact[] = sweepWalls(ball.position, velocity, remaining).map((contact) => ({
      ...contact,
      type: "wall",
      seat: -1,
      piece: -1,
      offset: 0,
    }));
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
          );
      if (paddle) contacts.push({ ...paddle, type: "paddle", seat: player.id, piece: -1 });
      player.pieces.forEach((body, piece) => {
        if (!player.health[piece]) return;
        const beforePiece = previousPieces[player.id]![piece]!;
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
    if (hit.type === "piece") {
      damagePiece(state, ball, hit.seat, hit.piece);
      return;
    }
    if (hit.type === "paddle") {
      ball.velocity = paddleReturn(ball.velocity, hit.offset, hit.normal);
      ball.slowSeat = null;
      struckPaddles.add(hit.seat);
      state.stats.paddleHits++;
      emit(state, "paddle", ball.position, hit.seat);
    } else {
      ball.velocity = sub(ball.velocity, scale(hit.normal, 2 * dot(ball.velocity, hit.normal)));
      emit(state, "wall", ball.position, -1);
    }
    ball.position = add(ball.position, scale(hit.normal, (hit.separation ?? 0) + 0.0001));
  }
  if (remaining > 1e-7 && ball.phase === "active" && state.phase === "playing")
    state.stats.collisionCaps++;
}
