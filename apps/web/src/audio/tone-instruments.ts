import * as Tone from "tone";
import type { MusicCue } from "./music-types";
import { createMelodic } from "./tone-melodic";
import { createCrowd } from "./tone-crowd";
import { createReactiveVoices } from "./tone-reactive";
import { createDrums } from "./tone-drums";

/** Separate live and arranged buses: a build's breath never makes a player hit unresponsive. */
export function createInstruments(context: Tone.BaseContext, output: Tone.InputNode) {
  const compressor = new Tone.Compressor({
    context,
    threshold: -12,
    ratio: 2.5,
    attack: 0.008,
    release: 0.12,
  }).connect(output);
  const duck = new Tone.Gain({ context, gain: 1 }).connect(compressor);
  const arranged = new Tone.Gain({ context, gain: 1 }).connect(duck);
  const melodic = createMelodic(context, arranged, compressor);
  const drums = createDrums(context, arranged, compressor);
  const crowd = createCrowd(context, compressor);
  const reactive = createReactiveVoices(context, arranged, compressor);
  return {
    play(cues: readonly MusicCue[], time: number) {
      for (const cue of cues) {
        const at = time;
        if (cue.voice === "breath") {
          arranged.gain.setTargetAtTime(0, at, 0.008);
        } else if (cue.voice === "open") {
          arranged.gain.setTargetAtTime(1, at, 0.01);
        } else {
          if (cue.voice === "kick") melodic.duck(at);
          if (cue.voice === "cheer") {
            duck.gain.cancelScheduledValues(at);
            duck.gain.setValueAtTime(0.65, at);
            duck.gain.linearRampToValueAtTime(1, at + 1.1);
            crowd.play(cue, at);
          } else if (!reactive.play(cue, at) && !drums.play(cue, at)) melodic.play(cue, at);
        }
      }
    },
    fadeScore(time: number) {
      arranged.gain.cancelScheduledValues(time);
      arranged.gain.setTargetAtTime(0, time, 0.025);
    },
    dispose() {
      crowd.dispose();
      reactive.dispose();
      melodic.dispose();
      drums.dispose();
      arranged.dispose();
      duck.dispose();
      compressor.dispose();
    },
  };
}
