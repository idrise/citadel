import type { MusicCue, MusicVisuals } from "./music-types";

export interface MusicEngine {
  play: (cues: readonly MusicCue[]) => void;
  setPlaying: (value: boolean, volume: number) => void;
  pulse: () => number;
  visuals: () => MusicVisuals;
  finish: () => void;
  dispose: () => void;
}
export type EngineLoader = (
  context: AudioContext,
  onStep: (step: number) => readonly MusicCue[],
) => Promise<MusicEngine>;
export type MusicStatus =
  | "idle"
  | "loading"
  | "playing"
  | "paused"
  | "off"
  | "unavailable"
  | "ending";
