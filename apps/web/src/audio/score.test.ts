import { expect, it } from "vite-plus/test";
import { arrangementAt } from "./arrangement";
import { composeStep } from "./score";
import { SIXTEENTH } from "./music-types";

it("guarantees an audible authored melody and bass before any player hits", () => {
  const opening = Array.from({ length: 64 }, (_, step) => composeStep(step, [], 0, 0)).flat();
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
  expect(breakdown.some((c) => c.voice === "arp")).toBe(true);
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
      expect(cue.brightness).toBeGreaterThanOrEqual(0);
      expect(cue.brightness).toBeLessThanOrEqual(1);
      expect(cue.notes?.length ?? 1).toBeLessThanOrEqual(4);
    }
});
