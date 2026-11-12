import { expect, it } from "vite-plus/test";
import { barFeel, isHomeBar, melodyAt } from "./phrasing";
import { composeStep } from "./score";
import { HARMONY, harmonyAt } from "./arrangement";
const original = [
  [0, -1, -1, 3, -1, 2, 4, -1, 5, -1, -1, 3, 2, -1, 1, -1],
  [2, -1, 3, -1, -1, 5, -1, 4, 3, -1, 2, -1, 0, -1, -1, 1],
];
it("returns the complete original call/answer at the first groove and regularly in every round variant", () => {
  for (const variant of [0, 1, 2, 3])
    for (const start of [4, 8, 16, 24, 32, 40, 48, 56])
      for (let offset = 0; offset < 2; offset++) {
        const bar = start + offset,
          expected = original[offset]!;
        expect(isHomeBar(bar)).toBe(true);
        expect(melodyAt(bar, variant)).toEqual(expected);
        expect(harmonyAt(bar, variant).scale).toEqual(HARMONY[bar % 4]!.scale);
        const attacks = Array.from({ length: 16 }, (_, p) =>
          composeStep(bar * 16 + p, [], 0, 0, 1, variant)
            .filter((c) => c.voice === "lead")
            .map((c) => ({ p, note: c.note })),
        ).flat();
        expect(attacks).toEqual(
          expected.flatMap((degree, p) =>
            degree < 0 ? [] : [{ p, note: HARMONY[bar % 4]!.scale[degree]! }],
          ),
        );
      }
});
it("keeps departures between returns while colouring every neighbouring bar differently", () => {
  for (const variant of [0, 1, 2, 3]) {
    const departures = Array.from({ length: 6 }, (_, i) => melodyAt(10 + i, variant));
    expect(new Set(departures.map((t) => JSON.stringify(t))).size).toBeGreaterThanOrEqual(4);
    const feels = Array.from({ length: 8 }, (_, i) => barFeel(16 + i, variant));
    expect(new Set(feels.map((f) => JSON.stringify(f))).size).toBe(8);
    for (const feel of feels) {
      expect(feel.echo).toBeGreaterThanOrEqual(0.1);
      expect(feel.echo).toBeLessThanOrEqual(0.35);
      expect(Math.abs(feel.pan)).toBeLessThanOrEqual(0.2);
    }
  }
});
it("adds a few quiet chord-aware harmonies under the one-ball home melody", () => {
  const cues = Array.from({ length: 32 }, (_, i) => composeStep(64 + i, [], 0, 0, 1)).flat(),
    harmonies = cues.filter((c) => c.voice === "harmony");
  expect(harmonies.length).toBeGreaterThan(0);
  expect(harmonies.length).toBeLessThan(cues.filter((c) => c.voice === "lead").length);
  expect(harmonies.every((c) => c.velocity <= 0.3)).toBe(true);
});
it("bounds added voices and never duplicates a monophonic instrument at the same audio step", () => {
  for (const variant of [0, 1, 2, 3])
    for (const balls of [1, 2, 3, 4, 16])
      for (let step = 0; step < 768; step++) {
        const cues = composeStep(step, [62, 65, 69], 16, 1, balls, variant);
        for (const voice of ["hat", "mutedHat", "snare", "bass", "sub", "arp"])
          expect(cues.filter((c) => c.voice === voice).length).toBeLessThanOrEqual(1);
        for (const cue of cues) {
          expect(cue.velocity).toBeGreaterThanOrEqual(0);
          expect(cue.velocity).toBeLessThanOrEqual(1);
          if (cue.echo !== undefined) expect(cue.echo).toBeLessThanOrEqual(0.35);
        }
      }
});
