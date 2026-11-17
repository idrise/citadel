/** Loudness of the strongest 100 ms window, without diluting short cues with trailing silence. */
export function peakWindowRms(channels: readonly Float32Array[], sampleRate: number) {
  if (!Number.isFinite(sampleRate) || sampleRate <= 0) throw new Error("Invalid sample rate");
  const length = channels[0]?.length ?? 0;
  if (!length) return 0;
  if (channels.some((channel) => channel.length !== length))
    throw new Error("Channel lengths differ");
  const window = Math.min(length, Math.max(1, Math.round(sampleRate * 0.1)));
  let energy = 0,
    peak = 0;
  for (let i = 0; i < length; i++) {
    for (const channel of channels) {
      const value = channel[i]!;
      if (!Number.isFinite(value)) return NaN;
      energy += value * value;
      if (i >= window) energy -= channel[i - window]! ** 2;
    }
    if (i + 1 >= window) peak = Math.max(peak, energy / (window * channels.length));
  }
  return Math.sqrt(peak);
}
