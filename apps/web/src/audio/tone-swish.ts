import * as Tone from "tone";
import { swishParameters } from "./paddle-swish";
/** One shared air-noise source follows actual movement; no pitched motor or per-move voices. */
export function createPaddleSwish(context: Tone.BaseContext, output: Tone.InputNode) {
  const pan = new Tone.Panner({ context, pan: 0 }).connect(output);
  const gain = new Tone.Gain({ context, gain: 0 }).connect(pan);
  const filter = new Tone.Filter({ context, type: "bandpass", frequency: 1200, Q: 0.5 }).connect(
    gain,
  );
  const voice = new Tone.Noise({ context, type: "pink" }).connect(filter).start();
  return {
    steer(this: void, velocity: number, position: number, time = context.immediate()) {
      const p = swishParameters(velocity, position),
        at = time;
      filter.frequency.setTargetAtTime(p.frequency, at, 0.04);
      gain.gain.setTargetAtTime(p.gain, at, p.gain === 0 ? 0.04 : 0.012);
      pan.pan.setTargetAtTime(p.pan, at, 0.025);
    },
    dispose() {
      voice.dispose();
      filter.dispose();
      gain.dispose();
      pan.dispose();
    },
  };
}
