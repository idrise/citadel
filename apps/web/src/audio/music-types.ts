export const MUSIC_BPM = 136;
export const SIXTEENTH = 60 / MUSIC_BPM / 4;
export type MusicSection = "intro" | "groove" | "breakdown" | "build" | "drop" | "melodic";
export type Voice =
  | "kick"
  | "bass"
  | "sub"
  | "lead"
  | "player"
  | "hit"
  | "hat"
  | "openHat"
  | "clap"
  | "snare"
  | "pad"
  | "arp"
  | "riser"
  | "crash"
  | "damage"
  | "breath"
  | "open"
  | "mutedHat"
  | "harmony"
  | "acid"
  | "brass"
  | "cheer"
  | "tic"
  | "answer"
  | "unlock"
  | "success"
  | "serve"
  | "ricochet"
  | "eliminate"
  | "victory";
export interface MusicCue {
  voice: Voice;
  note: number;
  notes?: readonly number[];
  duration: number;
  velocity: number;
  brightness?: number;
}
export interface MusicFrame {
  elapsed: number;
  balls: number;
  alive: readonly boolean[];
}
export interface MusicVisuals {
  pulse: number;
  phase: number;
  energy: number;
}
