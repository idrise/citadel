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
    ballInterval: 10,
    maxBalls: 6,
  };
  for (const mode of ASSISTANCE) {
    const next = withAssistance(settings, mode.id);
    expect(assistanceMode(next)).toBe(mode.id);
    expect(next.mouseSensitivity).toBe(1.6);
    expect(next.reducedEffects).toBe(true);
    expect(next.ballInterval).toBe(10);
    expect(next.maxBalls).toBe(6);
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
});
