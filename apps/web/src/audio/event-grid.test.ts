import { expect, it } from "vite-plus/test";
import { createEventConductor, nextGrid } from "./event-grid";
import { SIXTEENTH, type MusicCue } from "./music-types";
import { HARMONY } from "./arrangement";
const hit: MusicCue = { voice: "hit", note: 68, duration: 0.12, velocity: 0.8 };
it("aligns bat notes to 32nds within 60ms, with a tiny immediate contact when needed", () => {
  const conductor = createEventConductor(),
    anchor = { time: 1, step: 0 };
  for (let i = 0; i < 200; i++) {
    const now = 1 + i * 0.017,
      notes = conductor.plan([hit], now, anchor),
      main = notes.find((n) => n.cue.voice === "hit")!;
    expect(main.time - now).toBeGreaterThanOrEqual(0.00499);
    expect(main.time - now).toBeLessThanOrEqual(SIXTEENTH / 2 + 0.00501);
    expect(main.step * 2).toBeCloseTo(Math.round(main.step * 2), 8);
    const scale = HARMONY[Math.floor(main.step / 16) % 4]!.scale;
    expect(scale.some((note) => (note - main.cue.note) % 12 === 0)).toBe(true);
  }
  const first = createEventConductor().plan([hit], 1.01, anchor);
  expect(first.find((n) => n.cue.voice === "tic")!.time).toBeCloseTo(1.015);
  expect(first.find((n) => n.cue.voice === "answer")!.step % 2).toBe(0);
});
it("uses the current transport anchor after resume and does not drift to wall-clock beats", () => {
  const anchor = { time: 25.3, step: 99 };
  const next = nextGrid(25.31, anchor);
  expect(next.step).toBe(99.5);
  expect(next.time).toBeCloseTo(anchor.time + SIXTEENTH / 2);
});
it("places breach cheers and arrivals on eighths and coalesces rapid crowd bursts", () => {
  const c = createEventConductor(),
    anchor = { time: 0, step: 0 };
  const cheer: MusicCue = { voice: "cheer", note: 50, duration: 1.15, velocity: 0.68 };
  const a = c.plan([cheer, { ...cheer, voice: "unlock" }], 0.013, anchor);
  expect(a).toHaveLength(2);
  for (const n of a) {
    expect(n.step % 2).toBe(0);
    expect(n.cue.notes!.length).toBeGreaterThanOrEqual(3);
  }
  expect(c.plan([cheer], 0.02, anchor)).toHaveLength(0);
  expect(c.plan([cheer], 1.1, anchor)).toHaveLength(1);
  c.reset();
  expect(c.plan([cheer], 0.02, anchor)).toHaveLength(1);
});

it("keeps success gestures strictly rising in each harmony and bounds dense ricochet feedback", () => {
  for (let bar = 0; bar < 4; bar++) {
    const cue: MusicCue = { voice: "success", note: 81, velocity: 0.8, duration: 0.55 };
    const result = createEventConductor().plan([cue], bar * 16 * SIXTEENTH + 0.01, {
      time: 0,
      step: 0,
    })[0]!;
    expect(result.step % 2).toBe(0);
    expect(result.cue.notes![1]).toBeGreaterThan(result.cue.notes![0]!);
    expect(result.cue.notes![2]).toBeGreaterThan(result.cue.notes![1]!);
  }
  const cues: MusicCue[] = Array.from({ length: 100 }, () => ({
    voice: "ricochet",
    note: 74,
    velocity: 0.1,
    duration: 0.04,
  }));
  const conductor = createEventConductor();
  expect(conductor.plan(cues, 0.01, { time: 0, step: 0 })).toHaveLength(1);
  expect(conductor.plan(cues, 0.02, { time: 0, step: 0 })).toHaveLength(0);
});
