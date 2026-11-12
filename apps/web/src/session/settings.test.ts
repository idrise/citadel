import { expect, it } from "vite-plus/test";
import {
  ASSISTANCE,
  assistanceMode,
  createSettings,
  matchOptions,
  withAssistance,
} from "./settings";
import { createMatch, stepMatch } from "../simulation/match";

it("compares all four aid modes without changing control or pacing choices", () => {
  const settings = {
    ...createSettings(true),
    mouseSensitivity: 1.6,
  };
  for (const mode of ASSISTANCE) {
    const next = withAssistance(settings, mode.id);
    expect(assistanceMode(next)).toBe(mode.id);
    expect(next.mouseSensitivity).toBe(1.6);
    expect(next.reducedEffects).toBe(true);
  }
  expect(settings.preview).toBe(true);
});

it("keeps informational preview and mouse sensitivity outside authoritative simulation options", () => {
  const replay = (mode: "none" | "preview" | "slowdown" | "both") => {
    const settings = withAssistance(createSettings(), mode);
    const options = matchOptions(settings, 0);
    let state = createMatch(2026);
    for (let tick = 0; tick < 2400; tick++) state = stepMatch(state, undefined, options);
    return state;
  };
  expect(replay("none")).toEqual(replay("preview"));
  expect(replay("slowdown")).toEqual(replay("both"));
  expect(matchOptions({ ...createSettings(), mouseSensitivity: 2 }, 0)).toEqual(
    matchOptions(createSettings(), 0),
  );
  expect(
    matchOptions({ ...createSettings(), music: false, musicVolume: 1, musicLights: false }, 0),
  ).toEqual(matchOptions(createSettings(), 0));
});

it("uses the actual announced round level for authoritative bot difficulty", () => {
  for (const level of [1, 25, 50, 75, 100]) {
    expect(matchOptions(createSettings(), 3, level)).toMatchObject({
      humanSeat: 3,
      botLevel: level,
    });
  }
});

it("takes pacing from the level and ignores obsolete saved ball overrides", () => {
  const legacy = { ...createSettings(), maxBalls: 8, ballInterval: 1 };
  expect(matchOptions(legacy, 0, 1)).toMatchObject({ maxBalls: 1, ballSpeed: 14 });
  expect(matchOptions(legacy, 0, 100)).toMatchObject({
    maxBalls: 8,
    ballSpeed: 34,
    ballInterval: 5,
  });
});
