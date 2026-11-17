import { expect, it } from "vite-plus/test";
import { botLevelProfile } from "../apps/web/src/simulation/bot-level";
import { aimServeAt } from "../apps/web/src/simulation/aim";
import { botIntent } from "../apps/web/src/simulation/bots";
import { createMatch } from "../apps/web/src/simulation/match";
import { angleDifference } from "../apps/web/src/simulation/vector";
import { eliteCatchTrial, eliteProxyTrial } from "./elite-bot-review";

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

it("a fallible legal controller can win the level-100 twelve-player finale", () => {
  const result = eliteProxyTrial(20, 12, 100);
  expect(result.won).toBe(true);
  expect(result.alive).toBe(true);
  expect(result.collisionCaps).toBe(0);
  // This bot proxy is a possibility regression, not a human difficulty calibration.
  expect(result.seconds).toBeGreaterThan(10);
}, 15000);

it("the level-60 proxy still loses a seeded duel against the elite bots", () => {
  expect(eliteProxyTrial(7, 2).won).toBe(false);
});
