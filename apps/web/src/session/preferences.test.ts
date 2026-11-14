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
  expect(parsePreferences('{"version":99}').count).toBe(6);
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
    effectsQuality: "high",
  });
  expect(restored.settings).not.toHaveProperty("unknown");
  expect(restored.settings).not.toHaveProperty("botDifficulty");
  expect(restored.settings).not.toHaveProperty("maxBalls");
  expect(restored.settings).not.toHaveProperty("ballInterval");
});
it("starts fresh or invalid preferences at six players, including unavailable storage", () => {
  for (const raw of [null, "broken", '{"version":99}', '{"version":1,"settings":{}}'])
    expect(parsePreferences(raw)).toMatchObject({ count: 6, humanSeat: 0 });
  for (const count of [0, 1, 17, 2.5, "16", null])
    expect(parsePreferences(JSON.stringify({ version: 1, count, settings: {} })).count).toBe(6);
  expect(loadPreferences(false, () => ({ getItem: () => null })).count).toBe(6);
  expect(
    loadPreferences(false, () => {
      throw new Error("blocked");
    }).count,
  ).toBe(6);
});
it.each([2, 6, 16] as const)(
  "restores a chosen %i-player roster instead of replacing it with the default",
  (count) => {
    let raw = "";
    const preferences = { count, humanSeat: count - 1, settings: createSettings() };
    savePreferences(preferences, () => ({
      setItem: (_key, value) => {
        raw = value;
      },
    }));
    expect(loadPreferences(false, () => ({ getItem: () => raw }))).toEqual(preferences);
  },
);
it("remains playable when storage is blocked, full or unavailable", () => {
  const blocked = () => {
    throw new Error("blocked");
  };
  expect(loadPreferences(true, blocked).settings.reducedEffects).toBe(true);
  expect(savePreferences({ count: 4, humanSeat: 0, settings: createSettings() }, blocked)).toBe(
    false,
  );
});
it("migrates old preferences to an independent effects bus, clamps it and retains both volumes", () => {
  const old = JSON.stringify({
    version: 1,
    count: 4,
    humanSeat: 0,
    settings: { musicVolume: 0.2 },
  });
  expect(parsePreferences(old).settings).toMatchObject({ musicVolume: 0.2, effectsVolume: 0.75 });
  const prefs = parsePreferences(
    JSON.stringify({ version: 1, settings: { effectsVolume: 9, musicVolume: -1 } }),
  );
  expect(prefs.settings.effectsVolume).toBe(1);
  expect(prefs.settings.musicVolume).toBe(0);
});
it("leaves old trajectory preferences off until the player explicitly enables the new serve marker", () => {
  for (const preview of [false, true]) {
    const saved = { version: 1, count: 6, humanSeat: 0, settings: { preview } };
    expect(parsePreferences(JSON.stringify(saved)).settings.serveGuide).toBe(false);
    expect(
      parsePreferences(JSON.stringify({ ...saved, settings: { preview, serveGuide: true } }))
        .settings.serveGuide,
    ).toBe(true);
  }
});
