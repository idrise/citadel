import { expect, it } from "vite-plus/test";
import { createAdaptiveResolution } from "./adaptive-resolution";
it("ignores isolated stalls, pause and CPU-heavy frames", () => {
  const resolution = createAdaptiveResolution();
  for (let i = 0; i < 600; i++) resolution.sample(i % 120 === 0 ? 1200 : 16.67, 2, 4, 6);
  expect(resolution.scale).toBe(1);
  for (let i = 0; i < 1200; i++) resolution.sample(33.3, 25, 4, 6);
  expect(resolution.scale).toBe(1);
  for (let i = 0; i < 300; i++) resolution.sample(33.3, 2, 4, 24, false);
  expect(resolution.scale).toBe(1);
});
it("reduces gradually under sustained GPU pressure, holds a floor and recovers slowly", () => {
  const resolution = createAdaptiveResolution();
  let previous = 1,
    changes = 0;
  for (let i = 0; i < 2400; i++) {
    const next = resolution.sample(33.3, 2, 4, 25);
    if (next !== previous) {
      expect(previous - next).toBeLessThanOrEqual(0.025001);
      changes++;
    }
    previous = next;
  }
  expect(changes).toBe(16);
  expect(previous).toBe(0.6);
  resolution.reset();
  expect(resolution.scale).toBe(0.6);
  for (let i = 0; i < 600; i++) resolution.sample(16.67, 2, 4, 6);
  expect(resolution.scale).toBe(0.6);
  for (let i = 0; i < 180; i++) resolution.sample(16.67, 2, 4, 6);
  expect(resolution.scale).toBe(0.61);
});
