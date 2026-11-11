/** A cheer opens and rises; the disappointed vowel closes and falls. */
export function crowdShape(loss: boolean) {
  return loss
    ? {
        pitch: [1.18, 1, 0.7] as const,
        formants: [
          [650, 800, 400],
          [1400, 1350, 800],
          [2700, 2700, 1800],
        ] as const,
        air: 0.35,
      }
    : {
        pitch: [0.82, 1.06, 1.22] as const,
        formants: [
          [450, 700, 850],
          [900, 1200, 1450],
          [2200, 2600, 3000],
        ] as const,
        air: 1,
      };
}
