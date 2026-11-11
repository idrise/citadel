export type EffectsQuality = "low" | "medium" | "high";
/** Presentation budgets only. Reduced effects overrides every quality setting. */
export function effectsProfile(
  quality: EffectsQuality = "high",
  reduced = false,
  deviceRatio = 1,
  maxSamples = 4,
) {
  const low = reduced || quality === "low";
  return {
    bloom: !low,
    reflections: !low,
    pixelRatio: Math.min(Math.max(deviceRatio, 1), low ? 1 : quality === "medium" ? 1.5 : 2),
    samples: Math.min(maxSamples, low ? 0 : quality === "medium" ? 2 : 4),
    shards: low ? 3 : quality === "medium" ? 7 : 10,
    trails: low ? 0 : quality === "medium" ? 12 : 20,
    sparks: low ? 0 : quality === "medium" ? 3 : 6,
  };
}
