import { expect, it } from "vite-plus/test";
import { createMatch, stepMatch } from "./match";
import { botIntent, BOT_PROFILES } from "./bots";
import { ARENA, fortress, railPosition } from "./arena";
import { DEFAULT_OPTIONS, IDLE_INTENT, type BotDifficulty } from "./types";
import { angleDifference, scale, unit } from "./vector";

it("uses seeded, visibly different reaction rates and prediction errors without hidden state", () => {
  const measurements = [];
  for (const difficulty of ["beginner", "standard", "expert"] as BotDifficulty[]) {
    const state = createMatch(7, 6),
      replay = createMatch(7, 6);
    const home = fortress(3, state.arena);
    for (const current of [state, replay]) {
      current.phase = "playing";
      Object.assign(current.balls[0]!, {
        phase: "active",
        position: railPosition(3, home.direction, 7, current.arena),
        velocity: scale(unit(home.direction), -24),
      });
    }
    let reactions = 0,
      error = 0;
    for (let step = 0; step < 600; step++) {
      state.elapsed = replay.elapsed = step / 120;
      const before = state.bots[3]!.reactionAt;
      const intent = botIntent(state, 3, difficulty);
      expect(intent).toEqual(botIntent(replay, 3, difficulty));
      expect(intent.version).toBe(1);
      expect(intent.steer).toBe(0);
      if (before !== state.bots[3]!.reactionAt) {
        reactions++;
        error += Math.abs(angleDifference(intent.targetAngle!, home.direction));
      }
    }
    measurements.push({ reactions, error: error / reactions });
  }
  expect(measurements[0]!.reactions).toBeLessThan(measurements[1]!.reactions);
  expect(measurements[1]!.reactions).toBeLessThan(measurements[2]!.reactions);
  expect(measurements[0]!.error).toBeGreaterThan(measurements[2]!.error * 1.5);
  expect(measurements[1]!.error).toBeGreaterThan(measurements[2]!.error * 1.3);
  expect(BOT_PROFILES.expert.horizon).toBeGreaterThan(BOT_PROFILES.beginner.horizon);
});
it.each(["beginner", "standard", "expert"] as const)(
  "%s bots move through ordinary intents with the same paddle speed limit",
  (difficulty) => {
    let state = createMatch(31, 5);
    for (let tick = 0; tick < 300; tick++) {
      const before = state.players.map((p) => p.angle);
      state = stepMatch(state, IDLE_INTENT, {
        ...DEFAULT_OPTIONS,
        humanSeat: -1,
        botDifficulty: difficulty,
      });
      state.players.forEach((player, index) =>
        expect(Math.abs(angleDifference(player.angle, before[index]!))).toBeLessThanOrEqual(
          ARENA.paddleSpeed / 120 + 1e-8,
        ),
      );
    }
  },
);
