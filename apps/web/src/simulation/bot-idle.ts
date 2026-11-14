import { clampPaddleAngle, fortress } from "./arena";
import type { MatchState } from "./types";
import { angleDifference, angleOf, length, sub } from "./vector";

/** Idle attention uses visible poses and a per-seat/time hash, never the match RNG stream. */
export function idleBotAngle(state: MatchState, seat: number, speed: number, reaction: number) {
  const home = fortress(seat, state.arena),
    bot = state.bots[seat]!;
  if (state.phase !== "playing") return bot.targetAngle;
  if (state.elapsed < (bot.idleAt ?? 0)) return bot.targetAngle;
  const bucket = Math.floor(state.elapsed / 1.2),
    hash = Math.imul((seat + 1) ^ (bucket + 23), 0x45d9f3b) >>> 0,
    jitter = (hash / 0xffffffff - 0.5) * 0.08;
  const ball = state.balls
    .filter((b) => b.phase === "active")
    .toSorted(
      (a, b) => length(sub(a.position, home.anchor)) - length(sub(b.position, home.anchor)),
    )[0];
  const offset = ball
    ? angleDifference(angleOf(sub(ball.position, home.anchor)), home.direction)
    : 0;
  const desired = clampPaddleAngle(
    seat,
    home.direction + (ball ? Math.max(-0.28, Math.min(0.28, offset * 0.18)) + jitter : 0),
    state.arena,
  );
  const step = Math.min(0.06, speed * 0.1);
  bot.targetAngle += Math.max(-step, Math.min(step, angleDifference(desired, bot.targetAngle)));
  bot.idleAt = state.elapsed + Math.max(0.3, reaction) + 0.2 * (hash / 0xffffffff);
  return bot.targetAngle;
}
