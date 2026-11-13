import { createPaddleSwish } from "./tone-swish";
import * as Tone from "tone";
import type { MusicCue } from "./music-types";
import { createMelodic } from "./tone-melodic";
import { createCrowd } from "./tone-crowd";
import { createReactiveVoices } from "./tone-reactive";
import { createFeedback } from "./tone-feedback";
import { createDrums } from "./tone-drums";
import { createImpactFeedback } from "./tone-impacts";

/** Separate live and arranged buses: a build's breath never makes a player hit unresponsive. */
export function createInstruments(context: Tone.BaseContext, output: Tone.InputNode) {
  const compressor = new Tone.Compressor({
    context,
    threshold: -12,
    ratio: 2.5,
    attack: 0.008,
    release: 0.12,
  }).connect(output);
  const scoreLevel = new Tone.Gain({ context, gain: 1 }).connect(compressor);
  const effectsLevel = new Tone.Gain({ context, gain: 1 }).connect(compressor);
  const duck = new Tone.Gain({ context, gain: 1 }).connect(scoreLevel);
  const arranged = new Tone.Gain({ context, gain: 1 }).connect(duck);
  const swish = createPaddleSwish(context, effectsLevel);
  const melodic = createMelodic(context, arranged);
  const drums = createDrums(context, arranged, effectsLevel);
  const feedback = createFeedback(context, effectsLevel);
  const impacts = createImpactFeedback(context, effectsLevel);
  const crowd = createCrowd(context, effectsLevel);
  const reactive = createReactiveVoices(context, arranged, effectsLevel);
  return {
    steer: swish.steer,
    setMix(music: number, effects: number, time: number) {
      for (const [bus, value] of [
        [scoreLevel, music],
        [effectsLevel, effects],
      ] as const) {
        bus.gain.cancelScheduledValues(time);
        bus.gain.setTargetAtTime(value, time, 0.015);
      }
    },
    play(cues: readonly MusicCue[], time: number, source: "music" | "effects" = "effects") {
      for (const cue of cues) {
        const at = time;
        if (cue.voice === "breath") {
          arranged.gain.setTargetAtTime(0, at, 0.008);
        } else if (cue.voice === "open") {
          arranged.gain.setTargetAtTime(1, at, 0.01);
        } else {
          if (cue.voice === "kick") melodic.duck(at);
          if (cue.voice === "cheer" || cue.voice === "damage") {
            duck.gain.cancelScheduledValues(at);
            duck.gain.setValueAtTime(0.4, at);
            duck.gain.linearRampToValueAtTime(1, at + cue.duration + 0.25);
            crowd.play(cue, at);
            if (cue.voice === "damage") drums.play(cue, at);
          } else if (
            !impacts.play(cue, at) &&
            !feedback.play(cue, at) &&
            !reactive.play(cue, at, source === "effects") &&
            !drums.play(cue, at)
          )
            melodic.play(cue, at);
        }
      }
    },
    fadeScore(time: number) {
      arranged.gain.cancelScheduledValues(time);
      arranged.gain.setTargetAtTime(0, time, 0.025);
    },
    beginOutro(time: number) {
      arranged.gain.cancelScheduledValues(time);
      arranged.gain.setTargetAtTime(0.7, time, 0.04);
    },
    dispose() {
      swish.dispose();
      feedback.dispose();
      impacts.dispose();
      crowd.dispose();
      reactive.dispose();
      melodic.dispose();
      drums.dispose();
      arranged.dispose();
      duck.dispose();
      scoreLevel.dispose();
      effectsLevel.dispose();
      compressor.dispose();
    },
  };
}
