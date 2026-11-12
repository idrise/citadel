import * as Tone from "tone";
import { createPaddleSwish } from "../apps/web/src/audio/tone-swish";
import { encodeWave } from "./pcm-wave";
export async function renderSwishPreview() {
  let swish: ReturnType<typeof createPaddleSwish> | undefined;
  const audio = await Tone.Offline(
    (context) => {
      swish = createPaddleSwish(context, context.destination);
      for (let frame = 0; frame < 300; frame++) {
        const t = frame / 60;
        const velocity = t < 1 || t > 4 ? 0 : Math.sin((t - 1) * Math.PI * 2) * 16;
        swish.steer(velocity, Math.sin((t - 1) * Math.PI * 2), t);
      }
    },
    5,
    2,
    44100,
  );
  const result = encodeWave([audio.getChannelData(0), audio.getChannelData(1)], 44100);
  swish?.dispose();
  audio.dispose();
  return result;
}
