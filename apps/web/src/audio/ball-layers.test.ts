import { expect, it } from "vite-plus/test";
import { composeStep } from "./score";
import { addBallLayers, harmonyNote } from "./ball-layers";
import { HARMONY } from "./arrangement";
const voices = (balls: number, streak = 0) =>
  new Set(
    Array.from({ length: 16 }, (_, i) => {
      const base = composeStep(64 + i, [62, 65, 69], 0, 0, 1).filter(
        (c) => c.voice === "lead" || c.voice === "pad",
      );
      return addBallLayers(64 + i, base, balls, streak);
    })
      .flat()
      .map((c) => c.voice),
  );
it("adds distinct harmonic and instrumental identities with each ball tier", () => {
  expect(voices(1).has("harmony")).toBe(false);
  expect(voices(2).has("harmony")).toBe(true);
  expect(voices(2).has("acid")).toBe(false);
  expect(voices(3).has("arp")).toBe(true);
  expect(voices(3).has("acid")).toBe(true);
  expect(voices(3).has("brass")).toBe(false);
  expect(voices(4).has("brass")).toBe(true);
  expect(voices(8)).toEqual(voices(4));
});
it("harmonises the theme with the current chord instead of adding an arbitrary fixed interval", () => {
  for (const chord of HARMONY)
    for (const note of chord.scale) {
      const harmony = harmonyNote(note, chord.pad);
      expect(harmony).toBeLessThanOrEqual(note - 3);
      expect(harmony).toBeGreaterThanOrEqual(note - 9);
      expect(chord.pad.some((pitch) => (pitch - harmony) % 12 === 0)).toBe(true);
    }
});
it("makes a good defence add responses, then removes those parts after its streak resets", () => {
  expect(voices(1, 0).has("answer")).toBe(false);
  expect(voices(1, 8).has("answer")).toBe(true);
  expect(voices(1, 12).has("brass")).toBe(true);
  expect(voices(1, 0).has("brass")).toBe(false);
  expect(composeStep(252, [62], 16, 1, 4).map((c) => c.voice)).toEqual(["breath"]);
});
