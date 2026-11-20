import * as Tone from "tone";
import { createMelodic } from "../apps/web/src/audio/tone-melodic";
import { TEASER_SAMPLE_RATE } from "./teaser-plan";
import { pitchBand } from "./pitch-band";

/** Reproduce the old mixed-rate render, then check the actual game's lead at the fixed rate. */
export async function checkTeaserPitch() {
  async function probe(sampleRate: number) {
    let voices: ReturnType<typeof createMelodic> | undefined;
    const audio = await Tone.Offline(
      (context) => {
        voices = createMelodic(context, context.destination);
        voices.play(
          { voice: "lead", note: 62, velocity: 0.8, duration: 0.7, brightness: 0.6 },
          0.05,
        );
      },
      0.9,
      1,
      sampleRate,
    );
    const expectedHz = 440 * 2 ** ((62 - 69) / 12);
    const samples = audio
      .getChannelData(0)
      .slice(Math.round(0.08 * sampleRate), Math.round(0.25 * sampleRate));
    const correct = pitchBand(samples, sampleRate, expectedHz);
    const shifted = pitchBand(samples, sampleRate, (expectedHz * 44100) / 48000);
    const result = {
      sampleRate,
      expectedHz,
      correct,
      shifted,
      shiftedToCorrect: shifted / correct,
    };
    audio.dispose();
    voices?.dispose();
    return result;
  }
  const reference = await probe(TEASER_SAMPLE_RATE);
  const oldMixedRate = await probe(44100);
  const corrected = await probe(TEASER_SAMPLE_RATE);
  if (oldMixedRate.shiftedToCorrect < 0.1)
    throw new Error("Mixed-rate regression did not reproduce");
  if (corrected.correct < 0.001 || corrected.shiftedToCorrect > 0.02)
    throw new Error("Corrected lead is still detuned");
  return { reference, oldMixedRate, corrected };
}
