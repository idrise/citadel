import { expect, it } from "vite-plus/test";
import { createSwishTrigger, swishParameters } from "./paddle-swish";

it("keeps tiny corrections silent and bounds deliberate strokes in either direction", () => {
  for (const velocity of [0, 0.1, 1, 1.59, NaN, Infinity, -Infinity])
    expect(swishParameters(velocity, NaN).gain).toBe(0);
  const slow = swishParameters(2, -1),
    fast = swishParameters(16, 1);
  expect(slow.gain).toBeGreaterThan(0.04);
  expect(fast.gain).toBeLessThanOrEqual(0.08);
  expect(fast.frequency).toBeGreaterThan(slow.frequency);
  expect(fast.endFrequency).toBeLessThan(fast.frequency);
  expect(slow.pan).toBe(-fast.pan);
  expect(swishParameters(-16, 1)).toEqual(fast);
  expect(swishParameters(100, 10)).toEqual(fast);
  expect(swishParameters(16, Infinity).pan).toBe(0);
});

it("plays once during a held stroke, then permits a deliberate reverse stroke", () => {
  const trigger = createSwishTrigger();
  expect(trigger(3.2, 0, 0)).not.toBeNull();
  for (let frame = 1; frame <= 120; frame++) expect(trigger(3.2, 0, frame / 120)).toBeNull();
  expect(trigger(-3.2, 0, 1.1)).not.toBeNull();
  expect(trigger(-3.2, 0, 2)).toBeNull();
});

it("does not turn gaps between mouse packets into repeated cues", () => {
  const trigger = createSwishTrigger();
  let cues = 0;
  for (let frame = 0; frame < 120; frame++)
    if (trigger(frame % 4 === 3 ? 0 : 3.2, 0, frame / 120)) cues++;
  expect(cues).toBe(1);
});

it("requires an 80ms rest before repeating a stroke in the same direction", () => {
  const trigger = createSwishTrigger();
  expect(trigger(4, 0, 0)).not.toBeNull();
  trigger(0, 0, 0.2);
  expect(trigger(4, 0, 0.25)).toBeNull();
  trigger(0, 0, 0.3);
  expect(trigger(4, 0, 0.39)).not.toBeNull();
});

it("bounds even rapid reversals to one cue per 180ms", () => {
  const trigger = createSwishTrigger();
  expect(trigger(16, 0, 0)).not.toBeNull();
  expect(trigger(-16, 0, 0.179)).toBeNull();
  expect(trigger(-16, 0, 0.18)).not.toBeNull();
  expect(trigger(16, 0, 0.359)).toBeNull();
  expect(trigger(16, 0, 0.36)).not.toBeNull();
});

it("rejects invalid/backwards timestamps and invalid speed without consuming the next stroke", () => {
  const trigger = createSwishTrigger();
  expect(trigger(16, 0, NaN)).toBeNull();
  expect(trigger(Infinity, 0, 0)).toBeNull();
  expect(trigger(16, NaN, 1)?.pan).toBe(0);
  expect(trigger(-16, 0, 0.5)).toBeNull();
  expect(trigger(-16, 0, 1.2)).not.toBeNull();
});
