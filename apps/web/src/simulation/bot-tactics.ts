import { ARENA, clampPaddleAngle, fortress } from "./arena";
import { aimServeAt, serveDirection } from "./aim";
import { botLevelProfile } from "./bot-level";
import { planIntercept } from "./bot-planner";
import { botStrokeAngle, botTargets, planBotShot } from "./bot-shot";
import { sweepCircle } from "./collision";
import { sample } from "./random";
import { alive, IDLE_INTENT, type MatchState, type PlayerIntent } from "./types";
import { add, angleDifference, angleOf, dot, length, scale, sub } from "./vector";

export function tacticalBotIntent(state: MatchState, seat: number, level: number): PlayerIntent {
  const bot = state.bots[seat],
    player = state.players[seat];
  if (!bot || !player || !alive(player)) return IDLE_INTENT;
  const profile = botLevelProfile(level),
    home = fortress(seat, state.arena);
  const ownServe = state.balls.find((b) => b.phase === "ready" && b.seat === seat);
  const threat = state.balls
    .filter(
      (b) =>
        b.phase === "active" &&
        dot(sub(b.position, home.anchor), b.velocity) < 0 &&
        length(sub(b.position, home.anchor)) < 9,
    )
    .toSorted(
      (a, b) => length(sub(a.position, home.anchor)) - length(sub(b.position, home.anchor)),
    )[0];
  if (!threat && ownServe) {
    delete bot.stroke;
    // Re-evaluate public supplies: a cached target may have been collected or expired.
    const targets = botTargets(state, seat, ownServe.position);
    const supply = targets.find((target) => {
      if (target.reward < 9) return false;
      const angle = aimServeAt(seat, target.position, state.arena);
      // Aim uses the actual moving serve origin; only select targets in the legal fan.
      const origin = add(
        home.anchor,
        scale({ x: Math.cos(angle), y: Math.sin(angle) }, ARENA.railRadius + 0.4),
      );
      const travel = sub(target.position, origin),
        direction = serveDirection(seat, angle, state.arena);
      const along = dot(travel, direction);
      return (
        along > 0 &&
        along / (state.difficulty?.ballSpeed ?? 24) < target.expires &&
        length(sub(travel, scale(direction, along))) < target.radius + ARENA.ballRadius
      );
    });
    if (supply) bot.serveTarget = supply.position;
    else if (
      !bot.serveTarget ||
      !targets.some(
        (t) =>
          t.reward < 9 &&
          t.position.x === bot.serveTarget!.x &&
          t.position.y === bot.serveTarget!.y,
      )
    ) {
      const enemies = targets.filter((t) => t.reward < 9);
      bot.serveTarget = enemies[Math.floor(sample(state) * enemies.length)]?.position ?? null;
    }
    if (bot.serveError === undefined) bot.serveError = (sample(state) - 0.5) * profile.error * 0.16;
    if (bot.serveTarget)
      bot.targetAngle = clampPaddleAngle(
        seat,
        aimServeAt(seat, bot.serveTarget, state.arena) + bot.serveError,
        state.arena,
      );
  } else if (threat) {
    bot.serveTarget = null;
    delete bot.serveError;
    const locked =
      bot.stroke &&
      bot.stroke.ballId === threat.id &&
      bot.stroke.contactAt >= state.elapsed - 0.04 &&
      bot.stroke.contactAt - state.elapsed < 0.18;
    if (!locked && state.elapsed >= bot.reactionAt) {
      const intercept = planIntercept(state, seat, profile.horizon, profile.speed);
      if (intercept) {
        const previous = bot.stroke;
        const reuse =
          previous &&
          previous.ballId === intercept.ballId &&
          state.elapsed - previous.plannedAt < 0.1;
        const shot = reuse
          ? {
              angle: intercept.angle + angleDifference(previous.angle, previous.contactAngle),
              swipe: previous.swipe,
            }
          : planBotShot(state, seat, intercept, profile.speed, profile.tactics);
        const angle = clampPaddleAngle(
          seat,
          shot.angle + (reuse ? 0 : (sample(state) - 0.5) * profile.error),
          state.arena,
        );
        bot.stroke = {
          ballId: intercept.ballId,
          angle,
          contactAngle: intercept.angle,
          swipe: shot.swipe,
          contactAt: state.elapsed + intercept.time,
          plannedAt: reuse ? previous.plannedAt : state.elapsed,
        };
        bot.targetAngle = angle;
      } else {
        delete bot.stroke;
        const collision = sweepCircle(
          threat.position,
          threat.velocity,
          home.anchor,
          ARENA.railRadius + ARENA.ballRadius + ARENA.paddleThickness / 2,
          profile.horizon,
        );
        const forecast = add(
          threat.position,
          scale(threat.velocity, collision?.time ?? profile.horizon),
        );
        bot.targetAngle = clampPaddleAngle(
          seat,
          angleOf(sub(forecast, home.anchor)) + (sample(state) - 0.5) * profile.error,
          state.arena,
        );
      }
      // Motor planning is bounded even at level 100; perception/catching still uses its level profile.
      bot.reactionAt = state.elapsed + profile.reaction + sample(state) * profile.jitter;
    }
  } else {
    delete bot.stroke;
    delete bot.serveError;
  }
  const targetAngle = bot.stroke
    ? clampPaddleAngle(seat, botStrokeAngle(bot.stroke, state.elapsed), state.arena)
    : bot.targetAngle;
  return {
    version: 1,
    targetAngle,
    steer: 0,
    launch: Boolean(
      ownServe &&
      ownServe.age > bot.serveDelay * profile.serveScale &&
      Math.abs(angleDifference(player.angle, bot.targetAngle)) < 0.08 &&
      !threat,
    ),
  };
}
