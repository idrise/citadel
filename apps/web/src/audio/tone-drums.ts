import * as Tone from "tone";
import type { MusicCue } from "./music-types";
const hz = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);
export function createDrums(
  context: Tone.BaseContext,
  output: Tone.InputNode,
  liveOutput: Tone.InputNode,
) {
  const kick = new Tone.MembraneSynth({
    context,
    volume: -10,
    pitchDecay: 0.045,
    octaves: 4.5,
    envelope: { attack: 0.001, decay: 0.25, sustain: 0, release: 0.08 },
  }).connect(output);
  const high = new Tone.Filter({ context, type: "highpass", frequency: 6500 }).connect(output);
  const hat = new Tone.NoiseSynth({
    context,
    volume: -21,
    envelope: { attack: 0.001, decay: 0.028, sustain: 0, release: 0.012 },
  }).connect(high);
  const openHat = new Tone.NoiseSynth({
    context,
    volume: -23,
    envelope: { attack: 0.002, decay: 0.13, sustain: 0, release: 0.04 },
  }).connect(high);
  const clapFilter = new Tone.Filter({
    context,
    type: "bandpass",
    frequency: 1550,
    Q: 0.7,
  }).connect(output);
  const clap = new Tone.NoiseSynth({
    context,
    volume: -14,
    envelope: { attack: 0.002, decay: 0.11, sustain: 0, release: 0.04 },
  }).connect(clapFilter);
  const snareFilter = new Tone.Filter({ context, type: "highpass", frequency: 1300 }).connect(
    output,
  );
  const snare = new Tone.NoiseSynth({
    context,
    volume: -18,
    envelope: { attack: 0.001, decay: 0.075, sustain: 0, release: 0.025 },
  }).connect(snareFilter);
  const snareBody = new Tone.Synth({
    context,
    volume: -22,
    oscillator: { type: "triangle" },
    envelope: { attack: 0.001, decay: 0.06, sustain: 0, release: 0.02 },
  }).connect(output);
  const crashFilter = new Tone.Filter({ context, type: "highpass", frequency: 3000 }).connect(
    output,
  );
  const crash = new Tone.NoiseSynth({
    context,
    volume: -19,
    envelope: { attack: 0.003, decay: 1.1, sustain: 0, release: 0.2 },
  }).connect(crashFilter);
  const damage = new Tone.PolySynth({
    context,
    voice: Tone.MembraneSynth,
    maxPolyphony: 4,
    options: {
      volume: -20,
      pitchDecay: 0.18,
      octaves: 3,
      envelope: { attack: 0.002, decay: 0.2, sustain: 0, release: 0.1 },
    },
  }).connect(liveOutput);
  return {
    play(cue: MusicCue, time: number) {
      const { voice, velocity, duration } = cue;
      if (voice === "kick") kick.triggerAttackRelease(hz(cue.note), duration, time, velocity);
      else if (voice === "hat") hat.triggerAttackRelease(duration, time, velocity);
      else if (voice === "openHat") openHat.triggerAttackRelease(duration, time, velocity);
      else if (voice === "clap") clap.triggerAttackRelease(duration, time, velocity);
      else if (voice === "snare") {
        snareFilter.frequency.setValueAtTime(1000 + (cue.brightness ?? 0.5) * 2000, time);
        snare.triggerAttackRelease(duration, time, velocity);
        snareBody.triggerAttackRelease(180, duration, time, velocity);
      } else if (voice === "crash") crash.triggerAttackRelease(duration, time, velocity);
      else if (voice === "damage")
        damage.triggerAttackRelease(hz(cue.note), duration, time, velocity);
      else return false;
      return true;
    },
    dispose() {
      for (const node of [
        kick,
        hat,
        openHat,
        high,
        clap,
        clapFilter,
        snare,
        snareBody,
        snareFilter,
        crash,
        crashFilter,
        damage,
      ])
        node.dispose();
    },
  };
}
