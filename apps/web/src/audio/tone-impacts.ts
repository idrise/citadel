import * as Tone from "tone";
import type { MusicCue } from "./music-types";
const hz = (note: number) => 440 * 2 ** ((note - 69) / 12);

/** Dedicated live voices: a low wall knock and a brighter, longer paddle ping. */
export function createImpactFeedback(context: Tone.BaseContext, output: Tone.InputNode) {
  const wall = new Tone.PolySynth({
    context,
    voice: Tone.FMSynth,
    maxPolyphony: 8,
    options: {
      volume: -3,
      harmonicity: 1.4,
      modulationIndex: 2.8,
      envelope: { attack: 0.001, decay: 0.055, sustain: 0, release: 0.035 },
      modulationEnvelope: { attack: 0.001, decay: 0.025, sustain: 0, release: 0.02 },
    },
  }).connect(output);
  const paddle = new Tone.PolySynth({
    context,
    voice: Tone.FMSynth,
    maxPolyphony: 8,
    options: {
      volume: -3,
      harmonicity: 2.5,
      modulationIndex: 1.8,
      envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.075 },
      modulationEnvelope: { attack: 0.001, decay: 0.065, sustain: 0, release: 0.04 },
    },
  }).connect(output);
  return {
    play(cue: MusicCue, time: number): boolean {
      if (cue.voice === "ricochet")
        wall.triggerAttackRelease(hz(cue.note - 24), 0.045, time, cue.velocity);
      else if (cue.voice === "hit")
        paddle.triggerAttackRelease(hz(cue.note), 0.09, time, cue.velocity);
      else return false;
      return true;
    },
    dispose() {
      wall.dispose();
      paddle.dispose();
    },
  };
}
