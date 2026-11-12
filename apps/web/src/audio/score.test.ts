import { expect, it } from "vite-plus/test";
import { arrangementAt } from "./arrangement";
import { composeStep } from "./score";
import { SIXTEENTH } from "./music-types";

it("keeps an authored melody and bass in the groove without requiring player hits", () => {
  const opening = Array.from({ length: 64 }, (_, step) => composeStep(64 + step, [], 0, 0)).flat();
  expect(opening.filter((c) => c.voice === "lead").length).toBeGreaterThan(20);
  expect(opening.filter((c) => c.voice === "bass").length).toBeGreaterThan(15);
  expect(
    new Set(opening.filter((c) => c.voice === "lead").map((c) => c.note)).size,
  ).toBeGreaterThan(6);
  expect(
    Math.min(...opening.filter((c) => c.voice === "lead").map((c) => c.velocity)),
  ).toBeGreaterThanOrEqual(0.6);
});
it("creates contrasting sections and reaches a drop around 28 seconds without streaks", () => {
  expect(arrangementAt(0).section).toBe("intro");
  expect(arrangementAt(64).section).toBe("groove");
  expect(arrangementAt(128).section).toBe("breakdown");
  expect(arrangementAt(192).section).toBe("build");
  expect(arrangementAt(256).section).toBe("drop");
  expect(256 * SIXTEENTH).toBeCloseTo(28.235, 2);
  expect(arrangementAt(384).section).toBe("melodic");
  expect(arrangementAt(512).section).toBe("build");
  expect(arrangementAt(640).section).toBe("drop");
});
it("gives the breakdown harmonic space instead of just lowering a drum loop", () => {
  const breakdown = Array.from({ length: 64 }, (_, i) => composeStep(128 + i, [], 0, 0)).flat();
  expect(breakdown.some((c) => c.voice === "kick" || c.voice === "bass")).toBe(false);
  expect(breakdown.filter((c) => c.voice === "pad")).toHaveLength(4);
  expect(breakdown.filter((c) => c.voice === "lead").length).toBeGreaterThan(15);
  expect(breakdown.some((c) => c.voice === "arp")).toBe(false);
});
it("accelerates a rising snare build, breathes, then releases full drums and doubled melody", () => {
  const count = (start: number) =>
    Array.from({ length: 16 }, (_, i) => composeStep(start + i, [], 0, 0))
      .flat()
      .filter((c) => c.voice === "snare").length;
  expect(count(192)).toBeLessThan(count(224));
  expect(count(224)).toBeLessThan(count(240));
  expect(composeStep(252, [], 0, 0).map((c) => c.voice)).toEqual(["breath"]);
  expect(composeStep(253, [], 0, 0)).toEqual([]);
  const drop = composeStep(256, [], 0, 0);
  for (const voice of ["open", "kick", "bass", "crash", "lead", "pad"])
    expect(drop.some((c) => c.voice === voice)).toBe(true);
  expect(drop.find((c) => c.voice === "lead")!.notes).toHaveLength(2);
});
it("keeps brightness, velocities and voices bounded across long arrangements", () => {
  for (let step = 0; step < 2048; step++)
    for (const cue of composeStep(step, [62, 65, 69], 16, 1)) {
      expect(cue.velocity).toBeGreaterThanOrEqual(0);
      expect(cue.velocity).toBeLessThanOrEqual(1);
      expect(cue.duration).toBeGreaterThan(0);
      expect(cue.brightness ?? 0.6).toBeGreaterThanOrEqual(0);
      expect(cue.brightness ?? 0.6).toBeLessThanOrEqual(1);
      expect(cue.notes?.length ?? 1).toBeLessThanOrEqual(4);
    }
});

it("starts with muted hats, then snare, before the driving kick arrives", () => {
  const first = Array.from({ length: 32 }, (_, i) => composeStep(i, [], 0, 0)).flat();
  expect(first.filter((c) => c.voice === "mutedHat")).toHaveLength(16);
  expect(first.some((c) => ["kick", "bass", "lead", "snare"].includes(c.voice))).toBe(false);
  const next = Array.from({ length: 32 }, (_, i) => composeStep(32 + i, [], 0, 0)).flat();
  expect(next.some((c) => c.voice === "snare")).toBe(true);
  expect(next.some((c) => c.voice === "kick")).toBe(false);
  expect(composeStep(64, [], 0, 0).some((c) => c.voice === "kick")).toBe(true);
});

it("never schedules the same monophonic hi-hat twice when performance and global layers coincide", () => {
  for (const balls of [1, 2, 3, 4, 8])
    for (const streak of [0, 3, 4, 8, 16])
      for (let step = 256; step < 384; step++) {
        const cues = composeStep(step, [62, 65], streak, 1, balls);
        expect(cues.filter((cue) => cue.voice === "hat").length).toBeLessThanOrEqual(1);
      }
});
it("develops phrase shapes and harmonic voicings across longer rounds while keeping the intro intact", () => {
  const signatures = Array.from({ length: 32 }, (_, bar) =>
    JSON.stringify(
      Array.from({ length: 16 }, (_, p) => composeStep((bar + 4) * 16 + p, [], 0, 0))
        .flat()
        .filter((c) => ["lead", "bass", "pad", "answer"].includes(c.voice)),
    ),
  );
  expect(new Set(signatures).size).toBeGreaterThan(24);
  for (const balls of [8, 12, 16])
    for (let step = 0; step < 800; step++) {
      const cues = composeStep(step, [62, 65], 16, 1, balls);
      expect(cues.every((c) => Number.isFinite(c.note) && c.velocity <= 1)).toBe(true);
      expect(cues.filter((c) => c.voice === "hat").length).toBeLessThanOrEqual(1);
    }
});
