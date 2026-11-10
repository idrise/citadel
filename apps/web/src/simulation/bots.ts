import { ARENA, FORTRESSES, clampPaddleAngle, fortress } from "./arena";
import { sweepCircle } from "./collision";
import { sample } from "./random";
import { alive, type MatchState, type PlayerIntent } from "./types";
import { add, angleDifference, angleOf, clamp, dot, length, scale, sub } from "./vector";

/** Limited linear prediction from the same visible ball state available to the player. */
export function botIntent(state: MatchState, seat: number): PlayerIntent {
  const bot = state.bots[seat];
  const player = state.players[seat];
  if (!bot || !player || !alive(player))
    return { version: 1, targetAngle: null, steer: 0, launch: false };
  const anchor = fortress(seat).anchor;
  const threats = state.balls.filter(
    (candidate) =>
      candidate.phase === "active" &&
      dot(sub(candidate.position, anchor), candidate.velocity) < 0 &&
      length(sub(candidate.position, anchor)) < 9,
  );
  threats.sort((a, b) => length(sub(a.position, anchor)) - length(sub(b.position, anchor)));
  const ownServe = state.balls.find(
    (candidate) => candidate.phase === "ready" && candidate.seat === seat,
  );
  const ball =
    threats[0] ?? ownServe ?? state.balls.find((candidate) => candidate.phase === "active");
  if (ball?.phase === "ready" && ball.seat === seat) {
    if (!bot.serveTarget) {
      const targets = state.players
        .filter((other) => other.id !== seat && alive(other))
        .flatMap((other) => FORTRESSES[other.id]!.pieces.filter((_, index) => other.health[index]));
      bot.serveTarget = targets[Math.floor(sample(state) * targets.length)] ?? null;
    }
    if (bot.serveTarget)
      bot.targetAngle = clampPaddleAngle(
        seat,
        angleOf(sub(bot.serveTarget, fortress(seat).anchor)),
      );
  } else {
    bot.serveTarget = null;
  }
  if (ball?.phase === "active" && state.elapsed >= bot.reactionAt) {
    const base = fortress(seat);
    const collision = sweepCircle(
      ball.position,
      ball.velocity,
      base.anchor,
      ARENA.railRadius + ARENA.ballRadius + ARENA.paddleThickness / 2,
      0.22,
    );
    const forecast = add(ball.position, scale(ball.velocity, collision?.time ?? 0.22));
    const contactAngle = angleOf(sub(forecast, base.anchor));
    const targets = state.players
      .filter((other) => other.id !== seat && alive(other))
      .flatMap((other) => FORTRESSES[other.id]!.pieces.filter((_, index) => other.health[index]));
    const target = targets[Math.floor(sample(state) * targets.length)];
    const desiredAngle = target ? angleOf(sub(target, forecast)) : base.direction;
    const aimOffset = clamp(angleDifference(desiredAngle, contactAngle) / 0.85, -0.8, 0.8);
    const error = (sample(state) - 0.5) * 1.5;
    bot.targetAngle = clampPaddleAngle(
      seat,
      contactAngle - aimOffset * ARENA.paddleHalfAngle + error,
    );
    bot.reactionAt = state.elapsed + 0.22 + sample(state) * 0.18;
  }
  return {
    version: 1,
    targetAngle: bot.targetAngle,
    steer: 0,
    launch: Boolean(ownServe && ownServe.age > bot.serveDelay),
  };
}
