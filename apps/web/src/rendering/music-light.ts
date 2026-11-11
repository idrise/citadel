/** Localised glow and exterior waves only: no exposure flash, camera or simulation changes. */
export function musicLight(pulse: number, reduced: boolean) {
  const amount = reduced || !Number.isFinite(pulse) ? 0 : Math.max(0, Math.min(1, pulse));
  return { bloomStrength: 0.25 + amount * 0.26, gridGain: 1 + amount * 0.9 };
}
