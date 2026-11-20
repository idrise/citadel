import { expect, it } from "vite-plus/test";
import { pitchBand } from "./pitch-band";
const sampleRate = 48000;
const note = 440 * 2 ** ((62 - 69) / 12);
function fixture(detuned = false) {
  return Float32Array.from(
    { length: 12000 },
    (_, index) =>
      0.25 * Math.sin((2 * Math.PI * note * index) / sampleRate) +
      (detuned
        ? 0.25 * Math.sin((((2 * Math.PI * note * 44100) / 48000) * index) / sampleRate)
        : 0),
  );
}
it("detects an in-tune D4 without confusing it with the sample-rate-shifted pitch", () => {
  const samples = fixture();
  expect(pitchBand(samples, sampleRate, note)).toBeCloseTo(0.25, 2);
  expect(pitchBand(samples, sampleRate, (note * 44100) / 48000)).toBeLessThan(0.001);
});
it("finds the second detuned voice even when the correct fundamental remains audible", () => {
  const samples = fixture(true);
  expect(pitchBand(samples, sampleRate, note)).toBeGreaterThan(0.24);
  expect(pitchBand(samples, sampleRate, (note * 44100) / 48000)).toBeGreaterThan(0.24);
});
it("reports silence without inventing a fundamental and rejects invalid probes", () => {
  expect(pitchBand(new Float32Array(12000), sampleRate, note)).toBe(0);
  expect(() => pitchBand(new Float32Array(0), sampleRate, note)).toThrow();
});
