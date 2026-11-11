import type { MusicCue } from "./music-types";
export const VICTORY_TAIL_SECONDS = 6;
/** A finite original closing phrase; only the audio clock continues after the rules finish. */
export function victoryOutro(step: number): MusicCue[] {
  if (step === 0)
    return [
      {
        voice: "pad",
        note: 62,
        notes: [50, 57, 62, 69],
        velocity: 0.32,
        duration: 3.8,
        brightness: 0.65,
      },
      { voice: "brass", note: 62, notes: [62, 69, 74], velocity: 0.35, duration: 0.5 },
    ];
  const answers: Record<number, number> = { 4: 74, 8: 77, 12: 81, 24: 81, 28: 84, 36: 86 };
  if (answers[step] !== undefined)
    return [
      { voice: "answer", note: answers[step]!, velocity: 0.32, duration: step === 36 ? 0.85 : 0.3 },
    ];
  if (step === 16 || step === 32)
    return [
      {
        voice: "brass",
        note: step === 16 ? 65 : 62,
        notes: step === 16 ? [65, 72, 77] : [62, 69, 74, 86],
        velocity: 0.32,
        duration: 0.75,
      },
    ];
  return [];
}
