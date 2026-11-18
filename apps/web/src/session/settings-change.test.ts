import { expect, it } from "vite-plus/test";
import { changeSetting } from "./settings-change";
import { createSettings, matchOptions } from "./settings";
import { parsePreferences } from "./preferences";
it("changes and persists graphics quality without altering sound, input, accessibility or simulation", () => {
  const initial = {
    ...createSettings(),
    musicVolume: 0.23,
    effectsVolume: 0.81,
    mouseSensitivity: 1.4,
  };
  for (const [step, quality] of ["low", "medium", "high"].entries()) {
    const settings = changeSetting(initial, "graphicsQuality", step);
    expect(settings).toEqual({ ...initial, effectsQuality: quality });
    expect(settings).not.toHaveProperty("graphicsQuality");
    expect(matchOptions(settings, 0, 12)).toEqual(matchOptions(initial, 0, 12));
    expect(parsePreferences(JSON.stringify({ version: 1, settings })).settings).toEqual(settings);
  }
  expect(initial.effectsQuality).toBe("high");
  expect(changeSetting(initial, "graphicsQuality", NaN)).toBe(initial);
  expect(changeSetting(initial, "graphicsQuality", -9).effectsQuality).toBe("low");
  expect(changeSetting(initial, "graphicsQuality", 99).effectsQuality).toBe("high");
});
it("retains the existing sound and sensitivity slider bounds", () => {
  const initial = createSettings();
  expect(changeSetting(initial, "musicVolume", -1)).toMatchObject({ musicVolume: 0, music: false });
  expect(changeSetting(initial, "musicVolume", 2)).toMatchObject({ musicVolume: 1, music: true });
  expect(changeSetting(initial, "effectsVolume", 2).effectsVolume).toBe(1);
  expect(changeSetting(initial, "mouseSensitivity", 0).mouseSensitivity).toBe(0.5);
  expect(changeSetting(initial, "mouseSensitivity", 3).mouseSensitivity).toBe(2);
});
