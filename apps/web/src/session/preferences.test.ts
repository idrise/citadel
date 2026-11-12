import { expect, it } from "vite-plus/test";
import { loadPreferences, parsePreferences, savePreferences } from "./preferences";
import { createSettings } from "./settings";
it("round-trips solo choices without storing a match or audio resources", () => {
  let raw = "";
  const value = {
    count: 6 as const,
    humanSeat: 5,
    settings: { ...createSettings(), music: false, effectsQuality: "medium" as const },
  };
  expect(
    savePreferences(value, () => ({
      setItem: (_key, data) => {
        raw = data;
      },
    })),
  ).toBe(true);
  expect(parsePreferences(raw)).toEqual(value);
  expect(Object.keys(JSON.parse(raw))).toEqual(["version", "count", "humanSeat", "settings"]);
});
it("validates version/types/ranges and clamps a restored human seat to the roster", () => {
  expect(parsePreferences("broken", true).settings.reducedEffects).toBe(true);
  expect(parsePreferences('{"version":99}').count).toBe(4);
  const restored = parsePreferences(
    JSON.stringify({
      version: 1,
      count: 2,
      humanSeat: 5,
      settings: {
        music: "false",
        musicVolume: 9,
        mouseSensitivity: -1,
        maxBalls: 500,
        botDifficulty: "robot",
        effectsQuality: "ultra",
        unknown: true,
      },
    }),
  );
  expect(restored.humanSeat).toBe(1);
  expect(restored.settings).toMatchObject({
    music: true,
    musicVolume: 1,
    mouseSensitivity: 0.5,
    maxBalls: 4,
    effectsQuality: "high",
  });
  expect(restored.settings).not.toHaveProperty("unknown");
  expect(restored.settings).not.toHaveProperty("botDifficulty");
});
it("remains playable when storage is blocked, full or unavailable", () => {
  const blocked = () => {
    throw new Error("blocked");
  };
  expect(loadPreferences(true, blocked).settings.reducedEffects).toBe(true);
  expect(savePreferences({ count: 4, humanSeat: 0, settings: createSettings() }, blocked)).toBe(
    false,
  );
});
