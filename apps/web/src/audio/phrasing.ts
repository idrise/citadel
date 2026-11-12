// The original call/answer pair is the recurring identity; later shapes are departures.
const THEMES = [
  [0, -1, -1, 3, -1, 2, 4, -1, 5, -1, -1, 3, 2, -1, 1, -1],
  [2, -1, 3, -1, -1, 5, -1, 4, 3, -1, 2, -1, 0, -1, -1, 1],
  [5, -1, -1, 4, 3, -1, 2, -1, -1, 3, -1, 1, 0, -1, -1, -1],
  [-1, 0, -1, 2, -1, -1, 3, 4, -1, 5, -1, -1, 4, -1, 2, -1],
  [0, -1, 4, -1, -1, 3, -1, -1, 2, -1, -1, 1, 0, -1, -1, 6],
  [6, -1, -1, 5, -1, 4, -1, 3, -1, -1, 2, -1, 1, -1, 0, -1],
  [3, -1, 2, -1, 0, -1, -1, -1, 2, -1, 4, -1, -1, 5, -1, 4],
  [-1, -1, 0, -1, 3, -1, 4, -1, 5, -1, -1, 4, 2, -1, 1, -1],
] as const;

/** Introduce the tune in the first groove, then return for two bars in every eight. */
export function isHomeBar(bar: number) {
  return bar === 4 || bar === 5 || bar % 8 < 2;
}
export function melodyAt(bar: number, variant = 0) {
  const index = isHomeBar(bar) ? bar % 2 : 2 + ((bar + Math.floor(bar / 8) + variant) % 6);
  return THEMES[index]!;
}

/** Small bar-level changes colour the same notes without obscuring their rhythm or pitches. */
export function barFeel(bar: number, variant = 0) {
  const index = (bar + Math.floor(bar / 8) * 3 + variant) % 8;
  return {
    brightness: [0, 0.06, -0.04, 0.03, -0.06, 0.08, -0.02, 0.04][index]!,
    echo: [0.16, 0.23, 0.28, 0.13, 0.2, 0.3, 0.18, 0.25][index]!,
    pan: [0, -0.12, 0.1, -0.06, 0.12, 0, -0.1, 0.06][index]!,
    articulation: [1, 0.94, 1.08, 0.88, 1.04, 0.96, 1.12, 0.92][index]!,
    accompaniment: (
      ["harmony", "bells", "none", "answer", "brass", "bells", "harmony", "answer"] as const
    )[index]!,
  };
}
