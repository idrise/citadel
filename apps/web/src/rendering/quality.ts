export const QUALITY_LEVELS = ["low", "medium", "high"] as const;
export type EffectsQuality = (typeof QUALITY_LEVELS)[number];
export function qualityStep(quality: EffectsQuality) {
  return QUALITY_LEVELS.indexOf(quality);
}
export function qualityForStep(step: number): EffectsQuality {
  return QUALITY_LEVELS[Number.isFinite(step) ? Math.max(0, Math.min(2, Math.round(step))) : 2]!;
}
export function qualityLabel(step: number) {
  const quality = qualityForStep(step);
  return quality[0]!.toUpperCase() + quality.slice(1);
}
/** Presentation budgets only. Reduced effects overrides every quality setting. */
export function effectsProfile(
  quality: EffectsQuality = "high",
  reduced = false,
  deviceRatio = 1,
  maxSamples = 4,
  mobile = false,
) {
  const low = reduced || quality === "low";
  return {
    bloom: !low,
    reflections: !low && quality === "high",
    pixelRatio: Math.min(
      Math.max(deviceRatio, 1),
      low ? 1 : mobile ? (quality === "medium" ? 1 : 1.5) : quality === "medium" ? 1.5 : 2,
    ),
    samples: Math.min(maxSamples, low || mobile ? 0 : quality === "medium" ? 2 : 4),
    shards: low ? 3 : quality === "medium" ? 7 : 10,
    trails: low ? 0 : mobile ? 8 : quality === "medium" ? 12 : 20,
    sparks: low ? 0 : mobile ? 2 : quality === "medium" ? 3 : 6,
  };
}
