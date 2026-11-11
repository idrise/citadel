import { DEFAULT_OPTIONS, type BotDifficulty, type MatchOptions } from "../simulation/types";

export interface GameSettings {
  botDifficulty: BotDifficulty;
  preview: boolean;
  slowdown: boolean;
  reducedEffects: boolean;
  mouseSensitivity: number;
  serveTimeout: number;
  ballInterval: number;
  maxBalls: number;
  music: boolean;
  musicVolume: number;
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
    botDifficulty: "standard",
    preview: true,
    slowdown: false,
    reducedEffects,
    mouseSensitivity: 1,
    serveTimeout: 1.8,
    ballInterval: 15,
    maxBalls: 4,
    music: true,
    musicVolume: 0.45,
    musicLights: true,
  };
}
export function matchOptions(settings: GameSettings, humanSeat: number): MatchOptions {
  return {
    ...DEFAULT_OPTIONS,
    humanSeat,
    botDifficulty: settings.botDifficulty,
    slowdown: settings.slowdown,
    serveTimeout: settings.serveTimeout,
    ballInterval: settings.ballInterval,
    maxBalls: settings.maxBalls,
  };
}
