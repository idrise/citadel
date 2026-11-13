import * as Tone from "tone";
import { createInstruments } from "../apps/web/src/audio/tone-instruments";
import type { Voice } from "../apps/web/src/audio/music-types";
import { encodeWave } from "./pcm-wave";
/** Independent source auditions through the real shared mix buses, including every event voice. */
export async function renderSettingsMix(
  music: number,
  effects: number,
  source: "music" | "effects" | "both" = "both",
) {
  let instruments: ReturnType<typeof createInstruments> | undefined,
    limiter: Tone.Limiter | undefined;
  const audio = await Tone.Offline(
    (context) => {
      limiter = new Tone.Limiter({ context, threshold: -3 }).toDestination();
      instruments = createInstruments(context, limiter);
      instruments.setMix(music, effects, 0);
      if (source !== "effects")
        instruments.play(
          [
            { voice: "lead", note: 69, duration: 0.1, velocity: 0.7 },
            { voice: "answer", note: 74, duration: 0.2, velocity: 0.4 },
          ],
          0.15,
          "music",
        );
      if (source !== "music") {
        const effects: Voice[] = [
          "ricochet",
          "hit",
          "serve",
          "breach",
          "damage",
          "eliminate",
          "success",
          "victory",
          "unlock",
          "tic",
          "answer",
          "cheer",
        ];
        effects.forEach((voice, index) =>
          instruments!.play(
            [{ voice, note: 69, duration: 0.12, velocity: 0.6 }],
            0.2 + index * 0.3,
          ),
        );
        instruments.steer(3, 0.3, 0.15);
        instruments.steer(0, 0, 0.6);
      }
    },
    5,
    2,
    44100,
  );
  const channels = [audio.getChannelData(0), audio.getChannelData(1)];
  const windowRms = (from: number, to: number) => {
    let sum = 0,
      count = 0;
    for (const data of channels)
      for (let i = Math.floor(from * 44100); i < Math.floor(to * 44100); i++) {
        sum += data[i]! ** 2;
        count++;
      }
    return Math.sqrt(sum / count);
  };
  const result = {
    ...encodeWave(channels, 44100),
    musicRms: windowRms(0.15, 0.65),
    effectsRms: windowRms(0.9, 4.8),
  };
  instruments?.dispose();
  limiter?.dispose();
  audio.dispose();
  return result;
}
