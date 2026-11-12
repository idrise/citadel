import type { MusicSection } from "./music-types";

/** Original club structure: a short mix-in, groove, melodic space, tension and a real release. */
export function arrangementAt(step: number) {
  const bar = Math.floor(step / 16);
  let section: MusicSection;
  let start: number;
  let bars: number;
  if (bar < 4) {
    section = "intro";
    start = 0;
    bars = 4;
  } else if (bar < 8) {
    section = "groove";
    start = 4;
    bars = 4;
  } else if (bar < 12) {
    section = "breakdown";
    start = 8;
    bars = 4;
  } else if (bar < 16) {
    section = "build";
    start = 12;
    bars = 4;
  } else if (bar < 24) {
    section = "drop";
    start = 16;
    bars = 8;
  } else {
    const cycle = Math.floor((bar - 24) / 24),
      position = (bar - 24) % 24;
    section = position < 8 ? "melodic" : position < 16 ? "build" : "drop";
    start = 24 + cycle * 24 + (position < 8 ? 0 : position < 16 ? 8 : 16);
    bars = 8;
  }
  const progress = Math.min(1, (step - start * 16) / (bars * 16 - 1));
  const energy =
    section === "drop"
      ? 1
      : section === "build"
        ? 0.45 + progress * 0.55
        : section === "groove"
          ? 0.65
          : section === "intro"
            ? 0.45
            : 0.35;
  return {
    bar,
    position: step % 16,
    section,
    progress,
    energy,
    first: step === start * 16,
    breath: section === "build" && step >= (start + bars) * 16 - 4,
  };
}

// Dm9 / Bbmaj7 / Fadd9 / Csus2. Voicings and themes are authored for Citadel.
export const HARMONY = [
  { bass: 38, pad: [50, 57, 60, 65], scale: [62, 65, 67, 69, 72, 74, 77] },
  { bass: 34, pad: [46, 53, 57, 62], scale: [62, 65, 69, 70, 74, 77, 81] },
  { bass: 41, pad: [53, 60, 65, 69], scale: [60, 65, 67, 69, 72, 77, 81] },
  { bass: 36, pad: [48, 55, 60, 62], scale: [60, 62, 65, 67, 72, 74, 79] },
] as const;
export type Arrangement = ReturnType<typeof arrangementAt>;

/** Phrase-level substitutions and inversions, all in the same D-minor tonal family. */
export function harmonyAt(bar: number, variant = 0) {
  const journey = [
    0, 1, 2, 3, 0, 2, 1, 3, 1, 2, 0, 3, 2, 1, 3, 0, 0, 1, 3, 2, 1, 0, 2, 3, 2, 3, 1, 0, 1, 2, 3, 0,
  ];
  const chord = HARMONY[journey[(((bar + variant * 4) % 32) + 32) % 32]!]!;
  const inversion = Math.floor(bar / 8) % 3;
  const pad = chord.pad.map((note, i) => note + (i < inversion ? 12 : 0)).sort((a, b) => a - b);
  return { ...chord, pad };
}
