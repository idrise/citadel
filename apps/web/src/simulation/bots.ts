import { SUPPLIES } from "./supplies";
import { visibleTargets } from "./health";
import { aimServeAt } from "./aim";
import { ARENA, clampPaddleAngle, fortress } from "./arena";
import { sweepCircle } from "./collision";
import { sample } from "./random";
import { alive, type BotDifficulty, type MatchState, type PlayerIntent } from "./types";
import { add, angleDifference, angleOf, clamp, dot, length, scale, sub } from "./vector";

export { BOT_PROFILES } from "./bot-level";
import { BOT_PROFILES, botLevelProfile } from "./bot-level";
import { planIntercept } from "./bot-planner";

/** Limited linear prediction from the same visible ball state available to the player. */
export function botIntent(
  state: MatchState,
  seat: number,
  difficulty: BotDifficulty | number = "standard",
): PlayerIntent {
  const profile =
    typeof difficulty === "number" ? botLevelProfile(difficulty) : BOT_PROFILES[difficulty];
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
      const supply =
        typeof difficulty === "number" &&
        difficulty >= 85 &&
        player.health.filter(Boolean).length < 4
          ? state.supplies.find((drop) => drop.age >= SUPPLIES.fall)
          : undefined;
      bot.serveTarget =
        supply?.position ?? targets[Math.floor(sample(state) * targets.length)] ?? null;
    }
    if (bot.serveTarget) bot.targetAngle = aimServeAt(seat, bot.serveTarget, state.arena);
  } else {
    bot.serveTarget = null;
  }
  if (ball?.phase === "active" && state.elapsed >= bot.reactionAt) {
    const planned =
      typeof difficulty === "number" && difficulty >= 85
        ? planIntercept(state, seat, profile.horizon)
        : null;
    const base = fortress(seat, state.arena);
    const collision = sweepCircle(
      ball.position,
      ball.velocity,
      base.anchor,
      ARENA.railRadius + ARENA.ballRadius + ARENA.paddleThickness / 2,
      profile.horizon,
    );
    const forecast =
      planned?.point ??
      add(ball.position, scale(ball.velocity, collision?.time ?? profile.horizon));
    const contactAngle = angleOf(sub(forecast, base.anchor));
    const targets = visibleTargets(
      state.players.filter((other) => other.id !== seat && alive(other)),
    );
    const target =
      typeof difficulty === "number" && difficulty >= 85
        ? targets.toSorted((a, b) => length(sub(a, forecast)) - length(sub(b, forecast)))[0]
        : targets[Math.floor(sample(state) * targets.length)];
    const desiredAngle = target ? angleOf(sub(target, forecast)) : base.direction;
    const aimOffset = clamp(angleDifference(desiredAngle, contactAngle) / 0.85, -0.8, 0.8);
    const error = (sample(state) - 0.5) * profile.error;
    bot.targetAngle = clampPaddleAngle(
      seat,
      contactAngle - aimOffset * ARENA.paddleHalfAngle * (planned ? 0.25 : 1) + error,
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
