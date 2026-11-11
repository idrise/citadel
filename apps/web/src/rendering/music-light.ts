/** Presentation-only modulation. Never feeds the camera, input or authoritative simulation. */
export function musicLight(pulse: number, reduced: boolean) {
  const amount = reduced || !Number.isFinite(pulse) ? 0 : Math.max(0, Math.min(1, pulse));
  return { bloomStrength: 0.25 + amount * 0.06, gridGain: 1 + amount * 0.12 };
}
