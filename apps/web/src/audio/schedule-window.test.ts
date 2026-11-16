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

it("reports late and duplicate steps independently and excludes paused time from callback gaps", () => {
  const accept = createScheduleWindow();
  accept(1.15, 1);
  accept(1.15, 1.01);
  accept(1.25, 1.3);
  accept(NaN, 1.4);
  const report = accept.snapshot();
  expect(report).toMatchObject({ accepted: 1, duplicate: 1, late: 1, invalid: 1 });
  expect(report.minHeadroomMs).toBeCloseTo(-50);
  expect(report.maxCallbackGapMs).toBeCloseTo(290);
  accept.resume();
  accept(10.15, 10);
  expect(accept.snapshot().maxCallbackGapMs).toBeCloseTo(290);
  report.accepted = 0;
  expect(accept.snapshot().accepted).toBe(2);
});

it("buffers a controlled 80ms callback interruption without losing the next score note", () => {
  const run = (lookAhead: number) => {
    const accept = createScheduleWindow();
    // Next subdivision enters the scheduling horizon just before the main thread stalls.
    const due = 1 + lookAhead;
    accept(due, 1 + 0.08);
    return accept.snapshot();
  };
  expect(run(0.04).late).toBe(1);
  expect(run(0.15).late).toBe(0);
  expect(run(0.15).accepted).toBe(1);
});
