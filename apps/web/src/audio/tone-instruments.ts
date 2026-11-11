import * as Tone from "tone";
import type { MusicCue } from "./director";

/** Entirely synthesised voices; no samples or external audio requests. Explicit context ownership. */
export function createInstruments(context: Tone.BaseContext, output: Tone.InputNode) {
  const compressor = new Tone.Compressor({
    context,
    threshold: -16,
    ratio: 3,
    attack: 0.004,
    release: 0.15,
  }).connect(output);
  const delay = new Tone.FeedbackDelay({
    context,
    delayTime: 0.326,
    feedback: 0.18,
    wet: 0.14,
  }).connect(compressor);
  const bassGain = new Tone.Gain({ context, gain: 1 }).connect(compressor);
  const kick = new Tone.MembraneSynth({
    context,
    volume: -7,
    pitchDecay: 0.035,
    octaves: 6,
    envelope: { attack: 0.001, decay: 0.22, sustain: 0, release: 0.04 },
  }).connect(compressor);
  const bass = new Tone.MonoSynth({
    context,
    volume: -19,
    oscillator: { type: "sawtooth" },
    filter: { Q: 1, type: "lowpass", rolloff: -24 },
    envelope: { attack: 0.004, decay: 0.12, sustain: 0.2, release: 0.08 },
    filterEnvelope: {
      attack: 0.002,
      decay: 0.13,
      sustain: 0.15,
      release: 0.08,
      baseFrequency: 90,
      octaves: 2.8,
    },
  }).connect(bassGain);
  const lead = new Tone.FMSynth({
    context,
    volume: -22,
    harmonicity: 1.5,
    modulationIndex: 2.2,
    oscillator: { type: "triangle" },
    envelope: { attack: 0.003, decay: 0.15, sustain: 0.1, release: 0.12 },
    modulationEnvelope: { attack: 0.002, decay: 0.12, sustain: 0, release: 0.08 },
  }).connect(delay);
  const hits = new Tone.PolySynth({
    context,
    voice: Tone.FMSynth,
    maxPolyphony: 6,
    options: {
      volume: -15,
      harmonicity: 2,
      modulationIndex: 2.5,
      envelope: { attack: 0.002, decay: 0.09, sustain: 0, release: 0.1 },
    },
  }).connect(delay);
  const harmony = new Tone.FMSynth({
    context,
    volume: -25,
    harmonicity: 3,
    modulationIndex: 1.2,
    envelope: { attack: 0.005, decay: 0.08, sustain: 0, release: 0.1 },
  }).connect(delay);
  const damage = new Tone.PolySynth({
    context,
    voice: Tone.MembraneSynth,
    maxPolyphony: 4,
    options: {
      volume: -16,
      pitchDecay: 0.22,
      octaves: 4,
      envelope: { attack: 0.002, decay: 0.25, sustain: 0, release: 0.1 },
    },
  }).connect(compressor);
  const hat = new Tone.NoiseSynth({
    context,
    volume: -27,
    noise: { type: "white" },
    envelope: { attack: 0.001, decay: 0.025, sustain: 0, release: 0.01 },
  });
  const highpass = new Tone.Filter({ context, frequency: 7000, type: "highpass" }).connect(
    compressor,
  );
  hat.connect(highpass);
  const frequency = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);
  let immediateTime = 0;
  return {
    play(cues: readonly MusicCue[], time: number, immediate = false) {
      // Separate live-hit and sequenced voices avoid look-ahead notes delaying impacts.
      for (const cue of cues) {
        const at = immediate ? Math.max(time, immediateTime + 0.0001) : time;
        if (immediate) immediateTime = at;
        if (cue.voice === "kick") {
          kick.triggerAttackRelease(frequency(cue.note), cue.duration, at, cue.velocity);
          bassGain.gain.setValueAtTime(0.3, at);
          bassGain.gain.linearRampToValueAtTime(1, at + 0.13);
        } else if (cue.voice === "bass")
          bass.triggerAttackRelease(frequency(cue.note), cue.duration, at, cue.velocity);
        else if (cue.voice === "lead")
          lead.triggerAttackRelease(frequency(cue.note), cue.duration, at, cue.velocity);
        else if (cue.voice === "hit")
          hits.triggerAttackRelease(frequency(cue.note), cue.duration, at, cue.velocity);
        else if (cue.voice === "harmony")
          harmony.triggerAttackRelease(frequency(cue.note), cue.duration, at, cue.velocity);
        else if (cue.voice === "damage")
          damage.triggerAttackRelease(frequency(cue.note), cue.duration, at, cue.velocity);
        else hat.triggerAttackRelease(cue.duration, at, cue.velocity);
      }
    },
    dispose() {
      for (const node of [
        kick,
        bass,
        lead,
        hits,
        harmony,
        damage,
        hat,
        highpass,
        bassGain,
        delay,
        compressor,
      ])
        node.dispose();
    },
  };
}
