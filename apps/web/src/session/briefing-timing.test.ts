import { expect, it } from "vite-plus/test";
import {
  BRIEFING_NOTICE_SECONDS,
  BRIEFING_RISE_SECONDS,
  BRIEFING_SINK_SECONDS,
  levelBriefingTiming,
} from "./briefing-timing";

it("allows three words per second plus notice time, with animations outside the reading hold", () => {
  const timing = levelBriefingTiming(8, 7, 7);
  expect(timing.words).toBe(11);
  expect(timing.readingSeconds).toBe(11 / 3);
  expect(timing.duration).toBe(5.25);
  expect(timing.holdSeconds).toBeGreaterThanOrEqual(
    timing.readingSeconds + BRIEFING_NOTICE_SECONDS,
  );
  expect(timing.duration).toBeCloseTo(
    BRIEFING_RISE_SECONDS + timing.holdSeconds + BRIEFING_SINK_SECONDS,
  );
  expect(levelBriefingTiming(1).duration).toBe(5.25);
});
it("counts demotion notices, includes skipped unlocks and avoids re-reading upgrades on a retry", () => {
  expect(levelBriefingTiming(7, 7, 8, 8).words).toBe(levelBriefingTiming(7, 7, 8).words + 3);
  expect(levelBriefingTiming(9, 9, 7).words).toBeGreaterThan(levelBriefingTiming(9, 9, 9).words);
  expect(levelBriefingTiming(100, 99, 99).words).toBe(11);
});
it("gives every challenge enough fully raised time without a cap cutting off long warnings", () => {
  for (let level = 1; level <= 100; level++)
    for (const previous of [
      level,
      Math.max(1, level - 1),
      Math.max(1, level - 5),
      Math.min(100, level + 1),
    ])
      for (const loss of [level, Math.max(1, level - 1)]) {
        const t = levelBriefingTiming(
          level,
          loss,
          previous,
          level < previous ? previous : undefined,
        );
        expect(t.holdSeconds).toBeGreaterThanOrEqual(2);
        expect(t.holdSeconds + 1e-9).toBeGreaterThanOrEqual(t.words / 3 + 0.5);
        expect(t.duration * 4).toBe(Math.ceil(t.duration * 4));
      }
});
