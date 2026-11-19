import * as Tone from "tone";
import { createSwishTrigger } from "./paddle-swish";
/** One reusable sine voice gives intentional swipes a brief, rounded glide. */
export function createPaddleSwish(context: Tone.BaseContext, output: Tone.InputNode) {
  const pan = new Tone.Panner({ context, pan: 0 }).connect(output);
  const gain = new Tone.Gain({ context, gain: 0 }).connect(pan);
  const voice = new Tone.Oscillator({ context, type: "sine", frequency: 280 })
    .connect(gain)
    .start();
  const trigger = createSwishTrigger();
  return {
    steer(this: void, velocity: number, position: number, time = context.immediate()) {
      if (!Number.isFinite(time)) return;
      const cue = trigger(velocity, position, time);
      if (!cue) return;
      voice.frequency.cancelScheduledValues(time);
      voice.frequency.setValueAtTime(cue.frequency, time);
      voice.frequency.exponentialRampToValueAtTime(cue.endFrequency, time + 0.11);
      gain.gain.cancelAndHoldAtTime(time);
      gain.gain.linearRampToValueAtTime(cue.gain, time + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.00001, time + 0.12);
      gain.gain.setValueAtTime(0, time + 0.14);
      pan.pan.setTargetAtTime(cue.pan, time, 0.025);
    },
    dispose() {
      voice.dispose();
      gain.dispose();
      pan.dispose();
    },
  };
}
