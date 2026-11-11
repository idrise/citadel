import * as Tone from "tone";
import type { MusicCue } from "./music-types";
const hz = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);
export function createMelodic(
  context: Tone.BaseContext,
  output: Tone.InputNode,
  liveOutput: Tone.InputNode,
) {
  const delay = new Tone.PingPongDelay({
    context,
    delayTime: (60 / 136) * 0.75,
    feedback: 0.23,
    wet: 0.22,
  }).connect(output);
  const leadFilter = new Tone.Filter({
    context,
    frequency: 2600,
    type: "lowpass",
    rolloff: -24,
    Q: 0.8,
  }).connect(delay);
  const lead = new Tone.PolySynth({
    context,
    voice: Tone.Synth,
    maxPolyphony: 6,
    options: {
      volume: -4,
      oscillator: { type: "fatsawtooth", count: 2, spread: 11 },
      envelope: { attack: 0.004, decay: 0.18, sustain: 0.04, release: 0.12 },
    },
  }).connect(leadFilter);
  const padPan = new Tone.Panner({ context, pan: -0.12 }).connect(delay);
  const padFilter = new Tone.Filter({
    context,
    frequency: 1200,
    type: "lowpass",
    rolloff: -24,
  }).connect(padPan);
  const pad = new Tone.PolySynth({
    context,
    voice: Tone.Synth,
    maxPolyphony: 8,
    options: {
      volume: -20,
      oscillator: { type: "fatsawtooth", count: 2, spread: 8 },
      envelope: { attack: 0.18, decay: 0.3, sustain: 0.65, release: 0.35 },
    },
  }).connect(padFilter);
  const bassGain = new Tone.Gain({ context, gain: 1 }).connect(output);
  const bass = new Tone.MonoSynth({
    context,
    volume: -12,
    oscillator: { type: "sawtooth" },
    filter: { Q: 2.4, type: "lowpass", rolloff: -24 },
    envelope: { attack: 0.003, decay: 0.14, sustain: 0.22, release: 0.07 },
    filterEnvelope: {
      attack: 0.002,
      decay: 0.14,
      sustain: 0.1,
      release: 0.08,
      baseFrequency: 140,
      octaves: 3.2,
    },
  }).connect(bassGain);
  const sub = new Tone.Synth({
    context,
    volume: -19,
    oscillator: { type: "sine" },
    envelope: { attack: 0.005, decay: 0.16, sustain: 0.12, release: 0.08 },
  }).connect(bassGain);
  const arpPan = new Tone.Panner({ context, pan: 0.18 }).connect(delay);
  const arp = new Tone.FMSynth({
    context,
    volume: -15,
    harmonicity: 2,
    modulationIndex: 1.4,
    envelope: { attack: 0.003, decay: 0.08, sustain: 0, release: 0.08 },
  }).connect(arpPan);
  const player = new Tone.FMSynth({
    context,
    volume: -18,
    harmonicity: 1.5,
    modulationIndex: 1.8,
    envelope: { attack: 0.003, decay: 0.1, sustain: 0, release: 0.08 },
  }).connect(delay);
  const hits = new Tone.PolySynth({
    context,
    voice: Tone.FMSynth,
    maxPolyphony: 6,
    options: {
      volume: -12,
      harmonicity: 2,
      modulationIndex: 2,
      envelope: { attack: 0.002, decay: 0.09, sustain: 0, release: 0.09 },
    },
  }).connect(liveOutput);
  const riseFilter = new Tone.Filter({ context, type: "bandpass", frequency: 700, Q: 0.7 }).connect(
    output,
  );
  const rise = new Tone.NoiseSynth({
    context,
    volume: -22,
    envelope: { attack: 0.07, decay: 0.05, sustain: 0.5, release: 0.01 },
  }).connect(riseFilter);
  return {
    duck(time: number) {
      bassGain.gain.setValueAtTime(0.25, time);
      bassGain.gain.exponentialRampToValueAtTime(1, time + 0.16);
    },
    play(cue: MusicCue, time: number) {
      const { voice, duration, velocity } = cue,
        brightness = cue.brightness ?? 0.6;
      if (voice === "lead") {
        leadFilter.frequency.setValueAtTime(900 + brightness * 4900, time);
        lead.triggerAttackRelease((cue.notes ?? [cue.note]).map(hz), duration, time, velocity);
      } else if (voice === "pad") {
        padFilter.frequency.setValueAtTime(800 + brightness * 1500, time);
        pad.triggerAttackRelease((cue.notes ?? [cue.note]).map(hz), duration, time, velocity);
      } else if (voice === "bass") {
        bass.filter.detune.setValueAtTime((brightness - 0.5) * 1800, time);
        bass.triggerAttackRelease(hz(cue.note), duration, time, velocity);
      } else if (voice === "sub") sub.triggerAttackRelease(hz(cue.note), duration, time, velocity);
      else if (voice === "arp") arp.triggerAttackRelease(hz(cue.note), duration, time, velocity);
      else if (voice === "player")
        player.triggerAttackRelease(hz(cue.note), duration, time, velocity);
      else if (voice === "hit") hits.triggerAttackRelease(hz(cue.note), duration, time, velocity);
      else if (voice === "riser") {
        riseFilter.frequency.setValueAtTime(500 + brightness * 6500, time);
        rise.triggerAttackRelease(duration, time, velocity);
      }
    },
    dispose() {
      for (const node of [
        lead,
        leadFilter,
        pad,
        padFilter,
        padPan,
        bass,
        sub,
        bassGain,
        arp,
        arpPan,
        player,
        hits,
        rise,
        riseFilter,
        delay,
      ])
        node.dispose();
    },
  };
}
