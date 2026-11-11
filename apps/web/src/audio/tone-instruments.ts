import * as Tone from "tone";
import type { MusicCue } from "./music-types";
import { createMelodic } from "./tone-melodic";
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
  const arranged = new Tone.Gain({ context, gain: 1 }).connect(compressor);
  const melodic = createMelodic(context, arranged, compressor);
  const drums = createDrums(context, arranged, compressor);
  let immediateTime = 0;
  return {
    play(cues: readonly MusicCue[], time: number, immediate = false) {
      for (const cue of cues) {
        const at = immediate ? Math.max(time, immediateTime + 0.0001) : time;
        if (immediate) immediateTime = at;
        if (cue.voice === "breath") {
          arranged.gain.setTargetAtTime(0, at, 0.008);
        } else if (cue.voice === "open") {
          arranged.gain.setTargetAtTime(1, at, 0.01);
        } else {
          if (cue.voice === "kick") melodic.duck(at);
          if (!drums.play(cue, at)) melodic.play(cue, at);
        }
      }
    },
    dispose() {
      melodic.dispose();
      drums.dispose();
      arranged.dispose();
      compressor.dispose();
    },
  };
}
