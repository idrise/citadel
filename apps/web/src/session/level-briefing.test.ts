import { expect, it } from "vite-plus/test";
import { levelHighlights, lossMessage } from "./level-briefing";
import { freshProgress, levelAfterLoss, levelFor, recordResult } from "./progression";
import { levelDifficulty } from "../simulation/difficulty";

it("announces every ball and pickup unlock from the real 100-level curve", () => {
  expect(levelHighlights(1)).toEqual(["ONE BALL - WIDE BAT"]);
  for (let level = 2; level <= 100; level++) {
    const before = levelDifficulty(level - 1),
      after = levelDifficulty(level);
    const messages = levelHighlights(level);
    expect(messages.length).toBeGreaterThan(0);
    expect(messages.includes("EXTRA BALL")).toBe(after.maxBalls > before.maxBalls);
    expect(messages.includes("PICKUPS INTRODUCED")).toBe(level === 5);
    expect(messages.includes("MORE PICKUPS")).toBe(
      after.pickupCount > before.pickupCount && before.pickupCount > 0,
    );
    expect(messages.every((m) => m.length <= 20)).toBe(true);
  }
  expect(levelHighlights(100)).toEqual(["EXTRA BALL", "ELITE BOTS"]);
  expect(levelHighlights(2)).toEqual(["SPEED UP"]);
  expect(levelHighlights(NaN)).toEqual(levelHighlights(1));
});
it("makes shrinking bats and meaningful bot reaction improvements visible between unlocks", () => {
  const messages = Array.from({ length: 100 }, (_, i) => levelHighlights(i + 1)).flat();
  expect(messages).toContain("SMALLER BAT");
  expect(messages).toContain("QUICKER BOTS");
});
it("predicts precisely the loss outcome at progression boundaries, arena sizes and loss streaks", () => {
  for (const level of [1, 2, 7, 35, 60, 80, 99, 100])
    for (const count of [2, 3, 4, 5, 6] as const)
      for (const losses of [0, 1, 2]) {
        const progress = { ...freshProgress(), level, count, losses, rounds: 3 };
        for (const selected of [2, 3, 4, 5, 6] as const) {
          const attempt = levelFor(progress, selected);
          expect(levelAfterLoss(progress, selected)).toBe(
            recordResult(progress, {
              level: attempt,
              count: selected,
              place: 2,
              at: 0,
            }).level,
          );
        }
      }
});
it("states both safe retries and imminent demotion without threatening level-one players", () => {
  expect(lossMessage(7, 6)).toBe("LOSS DROPS TO LEVEL 06");
  expect(lossMessage(7, 7)).toBe("LOSS RETRIES LEVEL 07");
  expect(lossMessage(1, 1)).toBe("LEVEL 01 IS THE FLOOR");
});

it("compares the actual previous attempt when wins skip levels, losses retry, or a demotion reverses a milestone", () => {
  expect(levelHighlights(9, 7)).toContain("EXTRA BALL");
  expect(levelHighlights(21, 18)).toEqual(["EXTRA BALL", "MORE PICKUPS"]);
  expect(levelHighlights(9, 9)).toEqual([]);
  expect(levelHighlights(7, 8)).toContain("FEWER BALLS");
  expect(levelHighlights(95, 90)).toEqual(["EXTRA BALL", "MORE PICKUPS"]);
});
