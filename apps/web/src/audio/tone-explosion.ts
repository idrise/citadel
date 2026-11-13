import * as Tone from "tone";

/** Generated low-end impact plus filtered noise; no audio recordings or sample assets. */
export function createExplosion(context: Tone.BaseContext, output: Tone.InputNode) {
  const filter = new Tone.Filter({
    context,
    type: "lowpass",
    frequency: 1600,
    rolloff: -24,
    Q: 0.7,
  }).connect(output);
  const noise = new Tone.NoiseSynth({
    context,
    volume: -8,
    noise: { type: "brown" },
    envelope: { attack: 0.001, decay: 0.28, sustain: 0, release: 0.18 },
  }).connect(filter);
  const boom = new Tone.MembraneSynth({
    context,
    volume: -3,
    pitchDecay: 0.08,
    octaves: 3.2,
    envelope: { attack: 0.001, decay: 0.38, sustain: 0, release: 0.18 },
  }).connect(output);
  let last = -Infinity;
  return {
    play(time: number, velocity: number, ownLoss = false) {
      // Simultaneous eliminations share the impact rather than double-starting a monophonic synth.
      if (time - last < 0.025) return;
      last = time;
      noise.triggerAttackRelease(0.22, time, velocity * 0.8);
      boom.triggerAttackRelease(ownLoss ? 48 : 62, 0.35, time, velocity);
    },
    dispose() {
      noise.dispose();
      boom.dispose();
      filter.dispose();
    },
  };
}
