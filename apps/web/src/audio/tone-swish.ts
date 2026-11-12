import * as Tone from "tone";
import { swishParameters } from "./paddle-swish";
/** One continuously owned FM voice, rather than allocating a synth on every pointer event. */
export function createPaddleSwish(context: Tone.BaseContext, output: Tone.InputNode) {
  const pan = new Tone.Panner({ context, pan: 0 }).connect(output);
  const gain = new Tone.Gain({ context, gain: 0 }).connect(pan);
  const filter = new Tone.Filter({ context, type: "bandpass", frequency: 1700, Q: 0.7 }).connect(
    gain,
  );
  const voice = new Tone.FMOscillator({
    context,
    frequency: 110,
    type: "sine",
    modulationType: "sine",
    harmonicity: 2.31,
    modulationIndex: 0.5,
  })
    .connect(filter)
    .start();
  return {
    steer(this: void, velocity: number, position: number, time = context.immediate()) {
      const p = swishParameters(velocity, position),
        at = time;
      voice.frequency.setTargetAtTime(p.frequency, at, 0.025);
      voice.modulationIndex.setTargetAtTime(p.modulation, at, 0.02);
      gain.gain.setTargetAtTime(p.gain, at, p.gain === 0 ? 0.05 : 0.015);
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
