import { expect, it } from "vite-plus/test";
import { introBalance, rmsBetween } from "./teaser-levels";

it("preserves a quiet opening under constant mastering gain", () => {
  const result = introBalance(0.0001, 0.03, 0.0005, 0.15);
  expect(result.introLiftDb).toBeCloseTo(0);
  expect(result.mixedRelativeDb).toBeLessThan(-45);
});
it("detects the unwanted intro boost even when the final track is not clipping", () => {
  const result = introBalance(0.000109, 0.0306, 0.042, 0.2145);
  expect(result.introLiftDb).toBeGreaterThan(34);
  expect(result.introLiftDb).toBeLessThan(36);
});
it("measures only the requested window and rejects empty or silent comparisons", () => {
  expect(rmsBetween(new Float32Array([0, 0, 0.5, -0.5, 0, 0]), 2, 1, 2)).toBe(0.5);
  expect(() => rmsBetween(new Float32Array(10), 2, 2, 1)).toThrow();
  expect(() => introBalance(0, 1, 1, 1)).toThrow();
});
