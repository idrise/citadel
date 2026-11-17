import { expect, it } from "vite-plus/test";
import {
  BOT_FORMULAS,
  LEVEL_FORMULAS,
  levelFeatures,
  resolveLevel,
  type LevelOverride,
} from "./levels";
import { levelDifficulty } from "./difficulty";
import { levelArenaShape } from "./arena-variant";
import { levelBatProfile } from "./bat-profile";
import { botLevelProfile } from "./bot-level";
import { freshProgress, levelFor, recordResult } from "../session/progression";

it("starts with six, caps the first twenty rosters at seven and never starts with three", () => {
  expect(levelFeatures(1).playerCount).toBe(6);
  const counts = Array.from({ length: 100 }, (_, index) => levelFeatures(index + 1).playerCount);
  expect(counts).not.toContain(3);
  expect(counts.slice(0, 20).every((count) => count >= 2 && count <= 7)).toBe(true);
  expect(new Set(counts.slice(0, 20)).size).toBeGreaterThanOrEqual(4);
  expect(new Set(counts.slice(20))).toEqual(
    new Set([2, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]),
  );
  const frequency = (count: number) => counts.slice(20).filter((value) => value === count).length;
  for (const count of new Set(counts.slice(20)))
    if (count !== 6) expect(frequency(6)).toBeGreaterThan(frequency(count));
});

it("resolves every consumer from the same repeatable frozen settings, independently of call order", () => {
  const before = Array.from({ length: 100 }, (_, index) => levelFeatures(index + 1));
  for (let level = 100; level >= 1; level--) {
    const rules = levelFeatures(level);
    expect(rules).toEqual(before[level - 1]);
    expect(Object.isFrozen(rules)).toBe(true);
    expect(Object.isFrozen(rules.bots)).toBe(true);
    expect(levelDifficulty(level)).toBe(rules);
    expect(levelArenaShape(level)).toBe(rules.arenaShape);
    expect(levelBatProfile(level)).toBe(rules.batProfile);
    expect(botLevelProfile(level)).toBe(rules.bots);
  }
  expect(levelFeatures(NaN)).toBe(before[0]);
  expect(levelFeatures(-1)).toBe(before[0]);
  expect(levelFeatures(101)).toBe(before[99]);
  expect(levelFeatures(2.9)).toBe(before[1]);
});

it("overrides individual features and bot keys while retaining formulas for omitted keys and zero values", () => {
  const rules = resolveLevel(30, {
    playerCount: 6,
    arenaShape: "rounded",
    batProfile: "deep",
    maxBalls: 12,
    ballSpeed: 20,
    pickupCount: 0,
    batScale: 1.1,
    bots: { reaction: 0.4, jitter: 0 },
  });
  expect(rules).toMatchObject({
    playerCount: 6,
    arenaShape: "rounded",
    batProfile: "deep",
    maxBalls: 12,
    ballSpeed: 20,
    pickupCount: 0,
    batScale: 1.1,
    bots: { reaction: 0.4, jitter: 0 },
  });
  expect(rules.ballInterval).toBe(LEVEL_FORMULAS.ballInterval(30, 12));
  expect(resolveLevel(30, { maxBalls: 12, ballInterval: 5 }).ballInterval).toBe(5);
  expect(rules.bots.speed).toBe(BOT_FORMULAS.speed(30));
  expect(rules.bots.tactics).toBe(BOT_FORMULAS.tactics(30));
  expect(levelFeatures(30)).not.toEqual(rules);
});

it("rejects overrides that would violate the roster constraints", () => {
  for (const playerCount of [1, 3, 17, 2.5])
    expect(() => resolveLevel(30, { playerCount } as LevelOverride)).toThrow("playerCount");
  for (const level of [1, 20])
    expect(() => resolveLevel(level, { playerCount: 8 })).toThrow("playerCount");
  expect(resolveLevel(21, { playerCount: 16 }).playerCount).toBe(16);
});

it("preserves the actual saved level when a win or demotion changes the next roster", () => {
  let progress: ReturnType<typeof freshProgress> = {
    ...freshProgress(),
    level: 20,
    count: 6,
    rounds: 1,
  };
  progress = recordResult(progress, { level: 20, count: 6, place: 1, at: 1 });
  expect(progress.level).toBe(21);
  expect(levelFor(progress, levelFeatures(21).playerCount)).toBe(21);
  for (let at = 2; at <= 4; at++)
    progress = recordResult(progress, {
      level: 21,
      count: levelFeatures(21).playerCount,
      place: 2,
      at,
    });
  expect(progress.level).toBe(20);
  expect(progress.best).toBe(20);
  expect(levelFor(progress, levelFeatures(20).playerCount)).toBe(20);
});
