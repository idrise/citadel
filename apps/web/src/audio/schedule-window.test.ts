import { expect, it } from "vite-plus/test";
import { createScheduleWindow } from "./schedule-window";
it("rejects stale/backlogged and duplicate attacks then recovers at the next future subdivision", () => {
  const accept = createScheduleWindow();
  expect(accept(1.04, 1)).toBe(true);
  expect(accept(1.04, 1)).toBe(false);
  expect(accept(1.15, 1.2)).toBe(false);
  expect(accept(1.26, 1.3)).toBe(false);
  expect(accept(1.4, 1.35)).toBe(true);
  expect(accept(1.401, 1.4)).toBe(false);
  expect(accept(1.5, 1.45)).toBe(true);
});
