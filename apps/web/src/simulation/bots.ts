import { visibleTargets } from "./health";
import { aimServeAt } from "./aim";
import { ARENA, clampPaddleAngle, fortress } from "./arena";
import { sweepCircle } from "./collision";
import { sample } from "./random";
import { alive, type BotDifficulty, type MatchState, type PlayerIntent } from "./types";
import { add, angleDifference, angleOf, clamp, dot, length, scale, sub } from "./vector";

export const BOT_PROFILES = {
  beginner: { reaction: 0.38, jitter: 0.28, error: 2.0, horizon: 0.14, serveScale: 1.35 },
  standard: { reaction: 0.22, jitter: 0.18, error: 1.5, horizon: 0.22, serveScale: 1 },
  expert: { reaction: 0.1, jitter: 0.08, error: 0.38, horizon: 0.42, serveScale: 0.8 },
} as const;

/** Limited linear prediction from the same visible ball state available to the player. */
export function botIntent(
  state: MatchState,
  seat: number,
  difficulty: BotDifficulty = "standard",
): PlayerIntent {
  const profile = BOT_PROFILES[difficulty];
  const bot = state.bots[seat];
  const player = state.players[seat];
  if (!bot || !player || !alive(player))
    return { version: 1, targetAngle: null, steer: 0, launch: false };
  const anchor = fortress(seat, state.arena).anchor;
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
      const targets = visibleTargets(
        state.players.filter((other) => other.id !== seat && alive(other)),
      );
      bot.serveTarget = targets[Math.floor(sample(state) * targets.length)] ?? null;
    }
    if (bot.serveTarget) bot.targetAngle = aimServeAt(seat, bot.serveTarget, state.arena);
  } else {
    bot.serveTarget = null;
  }
  if (ball?.phase === "active" && state.elapsed >= bot.reactionAt) {
    const base = fortress(seat, state.arena);
    const collision = sweepCircle(
      ball.position,
      ball.velocity,
      base.anchor,
      ARENA.railRadius + ARENA.ballRadius + ARENA.paddleThickness / 2,
      profile.horizon,
    );
    const forecast = add(ball.position, scale(ball.velocity, collision?.time ?? profile.horizon));
    const contactAngle = angleOf(sub(forecast, base.anchor));
    const targets = visibleTargets(
      state.players.filter((other) => other.id !== seat && alive(other)),
    );
    const target = targets[Math.floor(sample(state) * targets.length)];
    const desiredAngle = target ? angleOf(sub(target, forecast)) : base.direction;
    const aimOffset = clamp(angleDifference(desiredAngle, contactAngle) / 0.85, -0.8, 0.8);
    const error = (sample(state) - 0.5) * profile.error;
    bot.targetAngle = clampPaddleAngle(
      seat,
      contactAngle - aimOffset * ARENA.paddleHalfAngle + error,
      state.arena,
    );
    bot.reactionAt = state.elapsed + profile.reaction + sample(state) * profile.jitter;
  }
  return {
    version: 1,
    targetAngle: bot.targetAngle,
    steer: 0,
    launch: Boolean(ownServe && ownServe.age > bot.serveDelay * profile.serveScale),
  };
}
