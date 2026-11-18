import { expect, it } from "vite-plus/test";
import {
  effectsProfile,
  QUALITY_LEVELS,
  qualityStep,
  qualityForStep,
  qualityLabel,
} from "./quality";
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

it("maps every discrete graphics step, clamps invalid input and progressively enables expensive passes", () => {
  for (const [step, quality] of QUALITY_LEVELS.entries()) {
    expect(qualityForStep(step)).toBe(quality);
    expect(qualityStep(quality)).toBe(step);
    expect(qualityLabel(step).toLowerCase()).toBe(quality);
  }
  expect(qualityForStep(-10)).toBe("low");
  expect(qualityForStep(50)).toBe("high");
  expect(qualityForStep(NaN)).toBe("high");
  expect(qualityForStep(0.6)).toBe("medium");
  for (const mobile of [false, true]) {
    const profiles = QUALITY_LEVELS.map((q) => effectsProfile(q, false, 3, 4, mobile));
    expect(profiles.map((p) => p.bloom)).toEqual([false, true, true]);
    expect(profiles.map((p) => p.reflections)).toEqual([false, false, true]);
    for (const budget of ["pixelRatio", "samples", "shards", "trails", "sparks"] as const)
      for (let i = 1; i < profiles.length; i++)
        expect(profiles[i]![budget]).toBeGreaterThanOrEqual(profiles[i - 1]![budget]);
    expect(profiles[0]).toMatchObject({ samples: 0, trails: 0, sparks: 0, pixelRatio: 1 });
  }
});
