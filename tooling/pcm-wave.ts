/** Browser-side PCM audition encoder, outside the shipped game. */
export function encodeWave(channels: readonly Float32Array[], sampleRate: number) {
  const length = channels[0]!.length,
    count = channels.length;
  const pcm = new Uint8Array(44 + length * count * 2),
    view = new DataView(pcm.buffer);
  const label = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i++) pcm[offset + i] = value.charCodeAt(i);
  };
  label(0, "RIFF");
  view.setUint32(4, pcm.length - 8, true);
  label(8, "WAVEfmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, count, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * count * 2, true);
  view.setUint16(32, count * 2, true);
  view.setUint16(34, 16, true);
  label(36, "data");
  view.setUint32(40, pcm.length - 44, true);
  let peak = 0,
    energy = 0;
  for (let i = 0; i < length; i++)
    for (let channel = 0; channel < count; channel++) {
      const sample = channels[channel]![i]!;
      peak = Math.max(peak, Math.abs(sample));
      energy += sample * sample;
      view.setInt16(
        44 + (i * count + channel) * 2,
        Math.round(Math.max(-1, Math.min(1, sample)) * 32767),
        true,
      );
    }
  let encoded = "";
  for (let i = 0; i < pcm.length; i += 16384)
    encoded += String.fromCharCode(...pcm.subarray(i, i + 16384));
  return { wav: btoa(encoded), peak, rms: Math.sqrt(energy / (length * count)), channels: count };
}
