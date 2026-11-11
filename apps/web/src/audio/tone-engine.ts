import * as Tone from "tone";
import { MUSIC_BPM, type MusicCue } from "./director";
import { createInstruments } from "./tone-instruments";
import type { MusicEngine } from "./ports";
import { createBeatEnvelope } from "./beat-envelope";
import { arrangementAt } from "./arrangement";

let replacedDefaultContext = false;

export function createToneEngine(
  native: AudioContext,
  onStep: (step: number) => readonly MusicCue[],
): MusicEngine {
  // Tone's public entrypoint creates a default context. Replace it with our gesture-unlocked
  // owned context, and close the unused default rather than leaving a second worker/context alive.
  if (!replacedDefaultContext) {
    Tone.getContext().dispose();
    replacedDefaultContext = true;
  }
  const context = new Tone.Context({ context: native, lookAhead: 0.04, updateInterval: 0.015 });
  Tone.setContext(context);
  const gate = native.createGain();
  gate.gain.value = 0;
  gate.connect(native.destination);
  const limiter = new Tone.Limiter({ context, threshold: -3 }).connect(gate);
  const instruments = createInstruments(context, limiter);
  const transport = context.transport;
  transport.bpm.value = MUSIC_BPM;
  let step = 0;
  let running = false;
  const beats = createBeatEnvelope();
  const event = transport.scheduleRepeat((time) => {
    const energy = arrangementAt(step).energy;
    const cues = onStep(step++);
    beats.scheduleEnergy(time, energy);
    for (const cue of cues) {
      if (cue.voice === "kick") beats.schedule(time, cue.velocity);
      else if (cue.voice === "pad" && !cues.some((item) => item.voice === "kick"))
        beats.schedule(time, 0.4);
    }
    instruments.play(cues, time);
  }, "16n");
  return {
    play(cues) {
      instruments.play(cues, native.currentTime + 0.005, true);
    },
    pulse: () => (running ? beats.read(native.currentTime) : 0),
    visuals: () => (running ? beats.frame(native.currentTime) : { pulse: 0, phase: -1, energy: 0 }),
    setPlaying(value, volume) {
      const now = native.currentTime;
      gate.gain.cancelScheduledValues(now);
      gate.gain.setTargetAtTime(value ? volume : 0, now, 0.008);
      if (value === running) return;
      running = value;
      if (value) transport.start(now + 0.05);
      else transport.pause(now);
    },
    dispose() {
      gate.gain.cancelScheduledValues(native.currentTime);
      gate.gain.value = 0;
      transport.clear(event);
      instruments.dispose();
      limiter.dispose();
      gate.disconnect();
      context.dispose();
    },
  };
}
