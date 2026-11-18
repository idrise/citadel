import { expect, it } from "vite-plus/test";
import { swishParameters } from "./paddle-swish";
it("is silent at rest, grows brighter with real speed, and follows the bat across stereo space", () => {
  expect(swishParameters(0, 0).gain).toBe(0);
  const slow = swishParameters(2, -1),
    fast = swishParameters(16, 1);
  expect(fast.gain).toBeGreaterThan(slow.gain);
  expect(fast.frequency).toBeGreaterThan(slow.frequency);
  expect(fast.modulation).toBeGreaterThan(slow.modulation);
  expect(slow.pan).toBe(-fast.pan);
  expect(swishParameters(-16, 1)).toEqual(fast);
  expect(swishParameters(Infinity, NaN).gain).toBe(0);
  expect(swishParameters(100, 10)).toEqual(fast);
});

it("gives ordinary bat movement an audible level while bounding the fastest swish", () => {
  expect(swishParameters(3.2, 0).gain).toBeGreaterThanOrEqual(0.05);
  expect(swishParameters(16, 0).gain).toBeLessThanOrEqual(0.3);
  for (const velocity of [0, 0.01, 0.1, 0.239, NaN, Infinity, -Infinity])
    expect(swishParameters(velocity, 0).gain).toBe(0);
});
it("increases volume smoothly with speed in both directions and caps out-of-range input", () => {
  let last = 0;
  for (const velocity of [0.25, 1, 3.2, 8, 16]) {
    const gain = swishParameters(velocity, 0).gain;
    expect(gain).toBeGreaterThan(last);
    expect(swishParameters(-velocity, 0).gain).toBe(gain);
    last = gain;
  }
  expect(swishParameters(1000, 0).gain).toBe(last);
});
