import { levelDifficulty } from "../simulation/difficulty";
import { DEFAULT_OPTIONS, type MatchOptions } from "../simulation/types";

export interface GameSettings {
  effectsQuality: "low" | "medium" | "high";
  preview: boolean;
  slowdown: boolean;
  reducedEffects: boolean;
  mouseSensitivity: number;
  serveTimeout: number;
  music: boolean;
  musicVolume: number;
  effectsVolume: number;
  musicLights: boolean;
}
export const ASSISTANCE = [
  { id: "none", label: "Neither", preview: false, slowdown: false },
  { id: "preview", label: "Preview only", preview: true, slowdown: false },
  { id: "slowdown", label: "Pressure slowdown only", preview: false, slowdown: true },
  { id: "both", label: "Preview + pressure slowdown", preview: true, slowdown: true },
] as const;
export type AssistanceMode = (typeof ASSISTANCE)[number]["id"];
export function assistanceMode(settings: GameSettings): AssistanceMode {
  return ASSISTANCE.find(
    (mode) => mode.preview === settings.preview && mode.slowdown === settings.slowdown,
  )!.id;
}
export function withAssistance(settings: GameSettings, id: AssistanceMode): GameSettings {
  const mode = ASSISTANCE.find((candidate) => candidate.id === id)!;
  return { ...settings, preview: mode.preview, slowdown: mode.slowdown };
}
export function createSettings(reducedEffects = false): GameSettings {
  return {
    effectsQuality: "high",
    preview: true,
    slowdown: false,
    reducedEffects,
    mouseSensitivity: 1,
    serveTimeout: 1.8,
    music: true,
    musicVolume: 0.45,
    effectsVolume: 0.75,
    musicLights: true,
  };
}
export function matchOptions(
  settings: GameSettings,
  humanSeat: number,
  level?: number,
): MatchOptions {
  const difficulty = level === undefined ? null : levelDifficulty(level);
  return {
    ...DEFAULT_OPTIONS,
    humanSeat,
    ...(difficulty
      ? {
          botLevel: difficulty.level,
          ballSpeed: difficulty.ballSpeed,
          ballInterval: difficulty.ballInterval,
          maxBalls: difficulty.maxBalls,
        }
      : {}),
    slowdown: settings.slowdown,
    serveTimeout: settings.serveTimeout,
  };
}
