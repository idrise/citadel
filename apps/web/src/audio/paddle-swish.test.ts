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
