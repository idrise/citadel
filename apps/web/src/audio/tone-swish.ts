import * as Tone from "tone";
import { createSwishTrigger, SWISH_ENVELOPE } from "./paddle-swish";
/** One filtered noise source creates a smooth swipe, with no oscillator or pitched body. */
export function createPaddleSwish(context: Tone.BaseContext, output: Tone.InputNode) {
  const pan = new Tone.Panner({ context, pan: 0 }).connect(output);
  const gain = new Tone.Gain({ context, gain: 0 }).connect(pan);
  const low = new Tone.Filter({ context, type: "lowpass", frequency: 650, Q: 0.5 }).connect(gain);
  const high = new Tone.Filter({ context, type: "highpass", frequency: 250, Q: 0.5 }).connect(low);
  const voice = new Tone.Noise({ context, type: "pink" }).connect(high).start();
  const trigger = createSwishTrigger();
  return {
    steer(this: void, velocity: number, position: number, time = context.immediate()) {
      if (!Number.isFinite(time)) return;
      const cue = trigger(velocity, position, time);
      if (!cue) return;
      low.frequency.cancelScheduledValues(time);
      low.frequency.setValueAtTime(650, time);
      low.frequency.exponentialRampToValueAtTime(cue.frequency, time + 0.08);
      low.frequency.exponentialRampToValueAtTime(650, time + 0.28);
      gain.gain.cancelScheduledValues(time);
      gain.gain.setValueCurveAtTime(SWISH_ENVELOPE, time, 0.28, cue.gain);
      gain.gain.setValueAtTime(0, time + 0.28);
      pan.pan.setTargetAtTime(cue.pan, time, 0.025);
    },
    dispose() {
      voice.dispose();
      high.dispose();
      low.dispose();
      gain.dispose();
      pan.dispose();
    },
  };
}
