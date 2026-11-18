import { expect, it } from "vite-plus/test";
import { botLevelProfile } from "../apps/web/src/simulation/bot-level";
import { aimServeAt } from "../apps/web/src/simulation/aim";
import { botIntent } from "../apps/web/src/simulation/bots";
import { FIXED_DT } from "../apps/web/src/simulation/arena";
import { levelDifficulty } from "../apps/web/src/simulation/difficulty";
import { DEFAULT_OPTIONS } from "../apps/web/src/simulation/types";
import { createMatch, stepMatch } from "../apps/web/src/simulation/match";
import { angleDifference } from "../apps/web/src/simulation/vector";
import { eliteCatchTrial, eliteProxyIntent } from "./elite-bot-review";

it.each([2, 4, 6, 12] as const)(
  "elite defenders both save and concede real shots in a %i-player arena",
  (count) => {
    const trials = Array.from({ length: 24 }, (_, index) => eliteCatchTrial(index + 1, count));
    const saves = trials.filter((trial) => trial.outcome === "save").length;
    const goals = trials.filter((trial) => trial.outcome === "damage").length;
    expect(saves).toBeGreaterThan(0);
    expect(goals).toBeGreaterThan(0);
    expect(saves + goals).toBe(trials.length);
    expect(trials.every((trial) => trial.collisionCaps === 0)).toBe(true);
    expect(eliteCatchTrial(1, count)).toEqual(trials[0]);
  },
);

it("elite serve error varies across seeds, has both signs and stays fixed while aiming", () => {
  const errors = Array.from({ length: 32 }, (_, index) => {
    const state = createMatch(index + 1, 4);
    state.phase = "playing";
    Object.assign(state.balls[0]!, { seat: 0, phase: "ready" });
    const first = botIntent(state, 0, 100);
    const target = state.bots[0]!.serveTarget!;
    const error = angleDifference(first.targetAngle!, aimServeAt(0, target, state.arena));
    expect(botIntent(state, 0, 100).targetAngle).toBe(first.targetAngle);
    expect(Math.abs(error)).toBeLessThanOrEqual(botLevelProfile(100).error * 0.08 + 1e-8);
    return error;
  });
  expect(Math.min(...errors)).toBeLessThan(-0.01);
  expect(Math.max(...errors)).toBeGreaterThan(0.01);
});

it.each([60, 100])(
  "the level-%i proxy caps both steering directions without overshooting a nearby target",
  (proxyLevel) => {
    const maxTurn = botLevelProfile(proxyLevel).speed * FIXED_DT;
    for (const turn of [-1, 1, -maxTurn / 2, maxTurn / 2, 0]) {
      const state = createMatch(3, 12, 3, 3, levelDifficulty(100));
      state.phase = "playing";
      state.balls = [];
      const current = state.players[0]!.angle;
      state.bots[0]!.targetAngle = current + turn;
      state.bots[0]!.idleAt = Infinity;
      const intent = eliteProxyIntent(state, proxyLevel);
      expect(intent.targetAngle).toBeCloseTo(
        current + Math.max(-maxTurn, Math.min(maxTurn, turn)),
        12,
      );
      expect(intent.launch).toBe(false);
    }
  },
);

// Winners of long, chaotic matches belong in the balance report. CI checks the
// controller contract over a short replay, independently of the resulting winner.
it.each([
  { seed: 3, count: 12 as const, proxyLevel: 100 },
  { seed: 7, count: 2 as const, proxyLevel: 60 },
])(
  "proxy level $proxyLevel produces bounded, repeatable inputs for $count seats",
  ({ seed, count, proxyLevel }) => {
    let state = createMatch(seed, count, 3, seed, levelDifficulty(100)),
      replay = structuredClone(state);
    const maxTurn = botLevelProfile(proxyLevel).speed * FIXED_DT;
    for (
      let tick = 0;
      tick < 360 && state.phase !== "finished" && state.players[0]!.health.some(Boolean);
      tick++
    ) {
      const current = state.players[0]!.angle,
        intent = eliteProxyIntent(state, proxyLevel),
        replayIntent = eliteProxyIntent(replay, proxyLevel);
      expect(replayIntent).toEqual(intent);
      expect(intent.version).toBe(1);
      if (intent.targetAngle !== null) {
        expect(Number.isFinite(intent.targetAngle)).toBe(true);
        expect(Math.abs(angleDifference(intent.targetAngle, current))).toBeLessThanOrEqual(
          maxTurn + 1e-8,
        );
      }
      state = stepMatch(state, intent, { ...DEFAULT_OPTIONS, humanSeat: 0 });
      replay = stepMatch(replay, replayIntent, { ...DEFAULT_OPTIONS, humanSeat: 0 });
      expect(state.stats.collisionCaps).toBe(0);
    }
    expect(state).toEqual(replay);
  },
);
