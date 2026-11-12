import { expect, it } from "vite-plus/test";
import { effectsProfile } from "./quality";
it("bounds render/particle budgets, retains antialiasing in bloom targets, and respects hardware sample limits", () => {
  const low = effectsProfile("low", false, 3, 4),
    medium = effectsProfile("medium", false, 3, 4),
    high = effectsProfile("high", false, 3, 4);
  expect(low.bloom).toBe(false);
  expect(low.reflections).toBe(false);
  expect(medium.samples).toBeGreaterThan(0);
  expect(high.samples).toBeGreaterThanOrEqual(medium.samples);
  expect(high.pixelRatio).toBe(2);
  expect(high.trails).toBeGreaterThan(medium.trails);
  expect(effectsProfile("high", false, 2, 0).samples).toBe(0);
  expect(effectsProfile("high", true, 3, 8)).toEqual(effectsProfile("low", true, 3, 8));
});
it("keeps bloom on mobile with bounded resolution, zero multisampling and smaller particle pools", () => {
  const mobile = effectsProfile("high", false, 3, 8, true);
  expect(mobile.bloom).toBe(true);
  expect(mobile.reflections).toBe(true);
  expect(mobile.pixelRatio).toBe(1.5);
  expect(mobile.samples).toBe(0);
  expect(mobile.trails).toBe(8);
  expect(effectsProfile("high", true, 3, 8, true).trails).toBe(0);
});
