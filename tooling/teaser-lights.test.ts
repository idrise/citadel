import { expect, it } from "vite-plus/test";
import { createTeaserLights } from "./teaser-lights";
import { SIXTEENTH } from "../apps/web/src/audio/music-types";
import { musicLight } from "../apps/web/src/rendering/music-light";

it("feeds the same kick envelope into the game's bloom without playing clip music", () => {
  const frame = createTeaserLights()(64 * SIXTEENTH + 0.025);
  expect(frame.pulse).toBeGreaterThan(0.6);
  expect(musicLight(frame.pulse, false).bloomStrength).toBeGreaterThan(0.4);
  expect(frame.phase).toBeGreaterThan(0);
});
it("keeps the lighting clock continuous when jumping to another edited shot", () => {
  const continuous = createTeaserLights(),
    time = 256 * SIXTEENTH + 0.05;
  for (let tick = 0; tick < time * 60; tick++) continuous(tick / 60);
  expect(continuous(time)).toEqual(createTeaserLights()(time));
});
