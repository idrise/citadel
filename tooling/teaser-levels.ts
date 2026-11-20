/** Compare the opening's musical balance before and after mastering, independent of overall gain. */
export function introBalance(
  sourceIntro: number,
  sourceGroove: number,
  mixedIntro: number,
  mixedGroove: number,
) {
  if (
    [sourceIntro, sourceGroove, mixedIntro, mixedGroove].some(
      (value) => !Number.isFinite(value) || value <= 0,
    )
  )
    throw new Error("Loudness comparison needs non-silent, finite windows");
  const sourceRelativeDb = 20 * Math.log10(sourceIntro / sourceGroove);
  const mixedRelativeDb = 20 * Math.log10(mixedIntro / mixedGroove);
  return { sourceRelativeDb, mixedRelativeDb, introLiftDb: mixedRelativeDb - sourceRelativeDb };
}

export function rmsBetween(samples: Float32Array, sampleRate: number, from: number, to: number) {
  const start = Math.round(from * sampleRate),
    end = Math.round(to * sampleRate);
  if (sampleRate <= 0 || start < 0 || end <= start || end > samples.length)
    throw new Error("Invalid audio window");
  let energy = 0;
  for (let index = start; index < end; index++) energy += samples[index]! ** 2;
  return Math.sqrt(energy / (end - start));
}
