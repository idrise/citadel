import { expect, it } from "vite-plus/test";
import { createFixedClock } from "./fixed-clock";

it.each([30, 60, 144])("produces 120 simulation steps in one second at %s rendered FPS", (fps) => {
  const clock = createFixedClock();
  let steps = 0;
  for (let frame = 0; frame < fps; frame++) clock.advance(1 / fps, () => steps++);
  expect(steps).toBe(120);
});
it("bounds a late frame and clears partial time on pause", () => {
  const clock = createFixedClock();
  expect(clock.advance(20, () => {})).toBe(12);
  clock.advance(0.004, () => {});
  clock.reset();
  expect(clock.advance(0.005, () => {})).toBe(0);
});
