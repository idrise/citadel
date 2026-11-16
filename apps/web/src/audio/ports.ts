import type { ScheduleDiagnostics } from "./schedule-window";
import type { MusicCue, MusicVisuals } from "./music-types";

export interface MusicEngine {
  diagnostics?: () => ScheduleDiagnostics & {
    lookAheadMs: number;
    updateIntervalMs: number;
    running: boolean;
  };
  setMix?: (music: number, effects: number) => void;
  steer?: (velocity: number, position: number) => void;
  play: (cues: readonly MusicCue[]) => void;
  setPlaying: (value: boolean, volume: number) => void;
  pulse: () => number;
  visuals: () => MusicVisuals;
  finish: (won?: boolean) => void;
  dispose: () => void;
}
export type EngineLoader = (
  context: AudioContext,
  onStep: (step: number) => readonly MusicCue[],
) => Promise<MusicEngine>;
export type MusicStatus =
  | "waiting"
  | "idle"
  | "loading"
  | "playing"
  | "paused"
  | "off"
  | "unavailable"
  | "ending";
