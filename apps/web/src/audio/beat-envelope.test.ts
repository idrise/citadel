import { expect, it } from "vite-plus/test";
import { createBeatEnvelope } from "./beat-envelope";
import { musicLight } from "../rendering/music-light";
it("waits for the audible kick, rises gently and decays before the next beat", () => {
  const beats = createBeatEnvelope();
  beats.schedule(1, 0.9);
  expect(beats.read(0.999)).toBe(0);
  expect(beats.read(1)).toBe(0);
  expect(beats.read(1.02)).toBeGreaterThan(0.8);
  expect(beats.read(1.3)).toBeLessThan(0.3);
  expect(beats.read(2)).toBe(0);
  beats.schedule(2, 0.5);
  expect(beats.read(2.012)).toBeLessThan(0.5);
});
it("bounds presentation changes and suppresses beat lights entirely with reduced effects", () => {
  for (const pulse of [-1, 0, 0.4, 1, 100, NaN]) {
    const lights = musicLight(pulse, false);
    expect(lights.bloomStrength).toBeGreaterThanOrEqual(0.25);
    expect(lights.bloomStrength).toBeLessThanOrEqual(0.51);
    expect(lights.gridGain).toBeGreaterThanOrEqual(1);
    expect(lights.gridGain).toBeLessThanOrEqual(1.9);
    expect(musicLight(pulse, true)).toEqual({ bloomStrength: 0.25, gridGain: 1 });
  }
});

it("keeps travelling wave phase and energy on audible time, including future build changes", () => {
  const beats = createBeatEnvelope();
  beats.schedule(1, 0.8);
  beats.scheduleEnergy(1, 0.45);
  beats.scheduleEnergy(2, 1);
  expect(beats.frame(0.9)).toEqual({ pulse: 0, phase: -1, energy: 0 });
  const during = beats.frame(1.1);
  expect(during.phase).toBeGreaterThan(0);
  expect(during.phase).toBeLessThan(1);
  expect(during.energy).toBe(0.45);
  expect(beats.frame(1.6)).toEqual({ pulse: 0, phase: -1, energy: 0.45 });
  expect(beats.frame(2).energy).toBe(1);
});
