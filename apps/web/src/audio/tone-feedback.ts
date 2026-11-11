import * as Tone from "tone";
import type { MusicCue } from "./music-types";
const hz = (note: number) => 440 * 2 ** ((note - 69) / 12);
/** Short, bright event gestures stay on the live bus, including a build's breath. */
export function createFeedback(context: Tone.BaseContext, output: Tone.InputNode) {
  const synth = new Tone.PolySynth({
    context,
    voice: Tone.FMSynth,
    maxPolyphony: 8,
    options: {
      volume: -13,
      harmonicity: 1.5,
      modulationIndex: 0.8,
      envelope: { attack: 0.003, decay: 0.13, sustain: 0.06, release: 0.12 },
      modulationEnvelope: { attack: 0.002, decay: 0.08, sustain: 0.05, release: 0.1 },
    },
  }).connect(output);
  return {
    play(cue: MusicCue, time: number): boolean {
      if (!["success", "serve", "ricochet", "eliminate", "victory"].includes(cue.voice))
        return false;
      const notes = cue.notes ?? [cue.note];
      if (cue.voice === "success" || cue.voice === "victory") {
        notes.forEach((note, index) =>
          synth.triggerAttackRelease(
            hz(note),
            index === notes.length - 1 ? cue.duration : 0.16,
            time + index * 0.075,
            cue.velocity * (0.75 + index * 0.08),
          ),
        );
      } else if (cue.voice === "serve") {
        synth.triggerAttackRelease(hz(cue.note), 0.07, time, cue.velocity);
        synth.triggerAttackRelease(hz(cue.note + 7), 0.1, time + 0.075, cue.velocity * 0.8);
      } else synth.triggerAttackRelease(hz(cue.note), cue.duration, time, cue.velocity);
      return true;
    },
    dispose: () => synth.dispose(),
  };
}
