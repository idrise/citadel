/** Hann-windowed tone amplitude around a target; useful for cached-wave pitch regressions. */
export function pitchBand(samples: Float32Array, sampleRate: number, centre: number, radius = 3) {
  const length = samples.length;
  if (length < 2 || sampleRate <= 0 || centre <= radius) throw new Error("Invalid pitch probe");
  const windowed = Float64Array.from(
    samples,
    (sample, index) => sample * (0.5 - 0.5 * Math.cos((2 * Math.PI * index) / (length - 1))),
  );
  let amplitude = 0;
  for (let frequency = centre - radius; frequency <= centre + radius; frequency += 0.25) {
    const coefficient = 2 * Math.cos((2 * Math.PI * frequency) / sampleRate);
    let previous = 0,
      before = 0;
    for (const sample of windowed) {
      const next = sample + coefficient * previous - before;
      before = previous;
      previous = next;
    }
    const power = Math.max(
      0,
      previous * previous + before * before - coefficient * previous * before,
    );
    amplitude = Math.max(amplitude, (4 * Math.sqrt(power)) / length);
  }
  return amplitude;
}
