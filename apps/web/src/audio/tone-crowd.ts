import * as Tone from "tone";
import type { MusicCue } from "./music-types";
const hz = (note: number) => 440 * 2 ** ((note - 69) / 12);
const FORMANTS = [
  [450, 800, 540],
  [900, 1350, 1800],
  [2400, 2700, 2500],
] as const;

/** A bounded electronic audience: staggered FM throats, changing vowels, breath and a faint whistle. */
export function createCrowd(context: Tone.BaseContext, output: Tone.InputNode) {
  const room = new Tone.FeedbackDelay({
    context,
    delayTime: 0.083,
    feedback: 0.22,
    wet: 0.17,
  }).connect(output);
  const banks = Array.from({ length: 2 }, () => {
    const voices = Array.from({ length: 6 }, (_, i) => {
      const pan = new Tone.Panner({ context, pan: (i / 5 - 0.5) * 1.6 }).connect(room);
      const synth = new Tone.FMSynth({
        context,
        volume: -5,
        harmonicity: 1,
        modulationIndex: 7 + i * 0.15,
        envelope: { attack: 0.055 + i * 0.008, decay: 0.4, sustain: 0.5, release: 0.32 },
        modulationEnvelope: { attack: 0.08, decay: 0.3, sustain: 0.55, release: 0.25 },
      });
      const vowel = FORMANTS.map((formant, index) => {
        const filter = new Tone.Filter({
          context,
          type: "bandpass",
          frequency: formant[0],
          Q: 3 + index,
        });
        const gain = new Tone.Gain({ context, gain: [1.4, 0.9, 0.5][index]! }).connect(pan);
        synth.connect(filter);
        filter.connect(gain);
        return { filter, gain };
      });
      const vibrato = new Tone.LFO({ context, frequency: 4.8 + i * 0.21, min: -7 - i, max: 7 + i })
        .connect(synth.detune)
        .start(0);
      return { synth, pan, vowel, vibrato };
    });
    const airFilter = new Tone.Filter({
      context,
      type: "bandpass",
      frequency: 1800,
      Q: 0.4,
    }).connect(room);
    const air = new Tone.NoiseSynth({
      context,
      volume: -26,
      noise: { type: "pink" },
      envelope: { attack: 0.08, decay: 0.3, sustain: 0.3, release: 0.2 },
    }).connect(airFilter);
    const whistle = new Tone.FMSynth({
      context,
      volume: -27,
      harmonicity: 1,
      modulationIndex: 0.2,
      envelope: { attack: 0.04, decay: 0.2, sustain: 0, release: 0.15 },
    }).connect(room);
    return { voices, airFilter, air, whistle };
  });
  let next = 0;
  return {
    play(cue: MusicCue, time: number) {
      const bank = banks[next++ % 2]!,
        notes = cue.notes ?? [50, 57, 60, 65];
      bank.voices.forEach(({ synth, vowel }, i) => {
        const at = time + [0, 0.035, 0.075, 0.02, 0.11, 0.055][i]!,
          note = notes[i % notes.length]! + (i >= 4 ? 12 : 0),
          pitch = hz(note);
        synth.triggerAttackRelease(
          pitch * 0.86,
          cue.duration,
          at,
          cue.velocity * (0.75 + (i % 3) * 0.08),
        );
        synth.frequency.exponentialRampToValueAtTime(pitch, at + 0.22);
        synth.frequency.exponentialRampToValueAtTime(pitch * 0.97, at + cue.duration);
        vowel.forEach(({ filter }, index) => {
          const formant = FORMANTS[index]!,
            variation = 1 + (i - 2.5) * 0.025;
          filter.frequency.setValueAtTime(formant[0] * variation, at);
          filter.frequency.exponentialRampToValueAtTime(formant[1] * variation, at + 0.28);
          filter.frequency.exponentialRampToValueAtTime(formant[2] * variation, at + 0.8);
        });
      });
      bank.air.triggerAttackRelease(cue.duration, time, cue.velocity);
      bank.whistle.triggerAttackRelease(hz(notes[0]! + 24), 0.23, time + 0.12, cue.velocity * 0.6);
    },
    dispose() {
      for (const bank of banks) {
        for (const voice of bank.voices) {
          voice.synth.dispose();
          voice.pan.dispose();
          voice.vibrato.dispose();
          for (const { filter, gain } of voice.vowel) {
            filter.dispose();
            gain.dispose();
          }
        }
        bank.air.dispose();
        bank.airFilter.dispose();
        bank.whistle.dispose();
      }
      room.dispose();
    },
  };
}
