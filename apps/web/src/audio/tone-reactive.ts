import * as Tone from "tone";
import type { MusicCue } from "./music-types";
const hz = (note: number) => 440 * 2 ** ((note - 69) / 12);
/** New ball layers have distinct timbres and registers, not just louder copies of the lead. */
export function createReactiveVoices(
  context: Tone.BaseContext,
  output: Tone.InputNode,
  live: Tone.InputNode,
) {
  const pan = new Tone.Panner({ context, pan: -0.25 }).connect(output);
  const harmony = new Tone.PolySynth({
    context,
    voice: Tone.Synth,
    maxPolyphony: 4,
    options: {
      volume: -11,
      oscillator: { type: "triangle" },
      envelope: { attack: 0.015, decay: 0.2, sustain: 0.25, release: 0.12 },
    },
  }).connect(pan);
  const acid = new Tone.MonoSynth({
    context,
    volume: -17,
    oscillator: { type: "square" },
    filter: { type: "lowpass", Q: 4, rolloff: -24 },
    envelope: { attack: 0.002, decay: 0.12, sustain: 0.05, release: 0.05 },
    filterEnvelope: {
      attack: 0.002,
      decay: 0.1,
      sustain: 0,
      release: 0.04,
      baseFrequency: 220,
      octaves: 3.5,
    },
  }).connect(output);
  const brass = new Tone.PolySynth({
    context,
    voice: Tone.FMSynth,
    maxPolyphony: 8,
    options: {
      volume: -16,
      harmonicity: 1,
      modulationIndex: 2.4,
      envelope: { attack: 0.018, decay: 0.16, sustain: 0.12, release: 0.13 },
      modulationEnvelope: { attack: 0.03, decay: 0.12, sustain: 0.2, release: 0.1 },
    },
  }).connect(output);
  const answers = new Tone.PolySynth({
    context,
    voice: Tone.FMSynth,
    maxPolyphony: 6,
    options: {
      volume: -16,
      harmonicity: 1.5,
      modulationIndex: 1.4,
      envelope: { attack: 0.002, decay: 0.13, sustain: 0, release: 0.09 },
    },
  }).connect(live);
  const filter = new Tone.Filter({ context, type: "bandpass", frequency: 2400, Q: 0.7 }).connect(
    live,
  );
  const tic = new Tone.NoiseSynth({
    context,
    volume: -24,
    envelope: { attack: 0.001, decay: 0.007, sustain: 0, release: 0.003 },
  }).connect(filter);
  const muteFilter = new Tone.Filter({
    context,
    type: "lowpass",
    frequency: 3300,
    rolloff: -24,
  }).connect(output);
  const mutedHat = new Tone.NoiseSynth({
    context,
    volume: -20,
    noise: { type: "pink" },
    envelope: { attack: 0.001, decay: 0.014, sustain: 0, release: 0.004 },
  }).connect(muteFilter);
  return {
    play(cue: MusicCue, time: number) {
      const { voice, note, velocity, duration } = cue;
      if (voice === "harmony") harmony.triggerAttackRelease(hz(note), duration, time, velocity);
      else if (voice === "acid") {
        acid.filter.detune.setValueAtTime(((cue.brightness ?? 0.5) - 0.5) * 2400, time);
        acid.triggerAttackRelease(hz(note), duration, time, velocity);
      } else if (voice === "brass")
        brass.triggerAttackRelease((cue.notes ?? [note]).map(hz), duration, time, velocity);
      else if (voice === "answer" || voice === "unlock")
        answers.triggerAttackRelease((cue.notes ?? [note]).map(hz), duration, time, velocity);
      else if (voice === "tic") tic.triggerAttackRelease(duration, time, velocity);
      else if (voice === "mutedHat") mutedHat.triggerAttackRelease(duration, time, velocity);
      else return false;
      return true;
    },
    dispose() {
      for (const node of [harmony, pan, acid, brass, answers, tic, filter, mutedHat, muteFilter])
        node.dispose();
    },
  };
}
