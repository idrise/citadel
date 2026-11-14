import { isPlayerCount } from "../simulation/player-count";
import type { PlayerCount } from "../simulation/arena";
import { createSettings, type GameSettings } from "./settings";
export const PREFERENCES_KEY = "citadel.solo.v1";
export const DEFAULT_PLAYER_COUNT: PlayerCount = 6;
export interface SoloPreferences {
  count: PlayerCount;
  humanSeat: number;
  settings: GameSettings;
}
const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
export function parsePreferences(raw: string | null, reduced = false): SoloPreferences {
  const fallback = { count: DEFAULT_PLAYER_COUNT, humanSeat: 0, settings: createSettings(reduced) };
  try {
    const source: unknown = JSON.parse(raw ?? "null");
    if (!record(source) || source.version !== 1 || !record(source.settings)) return fallback;
    const count = isPlayerCount(source.count)
      ? (Number(source.count) as PlayerCount)
      : DEFAULT_PLAYER_COUNT;
    const seat = Number.isInteger(source.humanSeat)
      ? Math.max(0, Math.min(count - 1, Number(source.humanSeat)))
      : 0;
    const settings = { ...fallback.settings },
      saved = source.settings;
    for (const key of [
      "preview",
      "serveGuide",
      "slowdown",
      "reducedEffects",
      "music",
      "musicLights",
    ] as const)
      if (typeof saved[key] === "boolean") settings[key] = saved[key];
    for (const [key, low, high] of [
      ["mouseSensitivity", 0.5, 2],
      ["serveTimeout", 1, 4],
      ["musicVolume", 0, 1],
      ["effectsVolume", 0, 1],
    ] as const) {
      const value = saved[key];
      if (typeof value === "number" && Number.isFinite(value))
        settings[key] = Math.max(low, Math.min(high, value));
    }
    if (["low", "medium", "high"].includes(String(saved.effectsQuality)))
      settings.effectsQuality = saved.effectsQuality as GameSettings["effectsQuality"];
    return { count, humanSeat: seat, settings };
  } catch {
    return fallback;
  }
}
export function loadPreferences(
  reduced = false,
  storage: () => Pick<Storage, "getItem"> = () => window.localStorage,
): SoloPreferences {
  try {
    return parsePreferences(storage().getItem(PREFERENCES_KEY), reduced);
  } catch {
    return parsePreferences(null, reduced);
  }
}
export function savePreferences(
  value: SoloPreferences,
  storage: () => Pick<Storage, "setItem"> = () => window.localStorage,
): boolean {
  try {
    storage().setItem(PREFERENCES_KEY, JSON.stringify({ version: 1, ...value }));
    return true;
  } catch {
    return false;
  }
}
