import { expect, it } from "vite-plus/test";
import { peakWindowRms } from "./pcm-level";
it("measures a short sound independently of trailing silence and averages stereo power", () => {
  const tone = new Float32Array(1000);
  tone.fill(0.5, 200, 300);
  expect(peakWindowRms([tone], 1000)).toBeCloseTo(0.5);
  expect(peakWindowRms([tone, new Float32Array(1000)], 1000)).toBeCloseTo(0.5 / Math.sqrt(2));
  expect(peakWindowRms([new Float32Array(10).fill(0.5)], 1000)).toBeCloseTo(0.5);
});
it("distinguishes an isolated click from sustained audible output and detects boundary-spanning sounds", () => {
  const click = new Float32Array(1000);
  click[250] = 0.5;
  expect(peakWindowRms([click], 1000)).toBeCloseTo(0.05);
  const tone = new Float32Array(1000);
  tone.fill(0.5, 251, 351);
  expect(peakWindowRms([tone], 1000)).toBeCloseTo(0.5);
});
it("reports silence and empty audio as zero, and rejects invalid inputs", () => {
  expect(peakWindowRms([], 1000)).toBe(0);
  expect(peakWindowRms([new Float32Array(1000)], 1000)).toBe(0);
  expect(peakWindowRms([new Float32Array([NaN])], 1000)).toBeNaN();
  expect(() => peakWindowRms([new Float32Array(1), new Float32Array(2)], 1000)).toThrow();
  for (const rate of [0, -1, NaN, Infinity]) expect(() => peakWindowRms([], rate)).toThrow();
});
