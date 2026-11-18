import { qualityForStep } from "../rendering/quality";
import type { SettingKey } from "../rendering/scene-settings";
import type { GameSettings } from "./settings";
/** Convert slider values into saved choices without touching a running match. */
export function changeSetting(
  settings: GameSettings,
  key: SettingKey,
  value: number,
): GameSettings {
  if (!Number.isFinite(value)) return settings;
  if (key === "graphicsQuality") return { ...settings, effectsQuality: qualityForStep(value) };
  const low = key === "mouseSensitivity" ? 0.5 : 0,
    high = key === "mouseSensitivity" ? 2 : 1,
    clamped = Math.max(low, Math.min(high, value));
  return { ...settings, [key]: clamped, ...(key === "musicVolume" ? { music: clamped > 0 } : {}) };
}
