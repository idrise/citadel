import * as Tone from "tone";
import { createMusicDirector, MUSIC_BPM } from "../apps/web/src/audio/director";
import { createInstruments } from "../apps/web/src/audio/tone-instruments";
import type { MusicCue, Voice } from "../apps/web/src/audio/music-types";
import type { GameEvent } from "../apps/web/src/simulation/types";
import { encodeWave } from "./pcm-wave";

/** Render the actual score and synth graph, including a no-hit audition or isolated stems. */
export async function renderMusicPreview(
  options: { duration?: number; voices?: readonly Voice[]; hits?: boolean } = {},
) {
  const duration = options.duration ?? 74;
  let instruments: ReturnType<typeof createInstruments> | undefined,
    limiter: Tone.Limiter | undefined;
  const only = (cues: readonly MusicCue[]) =>
    options.voices
      ? cues.filter(
          (cue) =>
            options.voices!.includes(cue.voice) || cue.voice === "open" || cue.voice === "breath",
        )
      : cues;
  const audio = await Tone.Offline(
    (context) => {
      context.destination.volume.value = 20 * Math.log10(0.45);
      limiter = new Tone.Limiter({ context, threshold: -3 }).toDestination();
      instruments = createInstruments(context, limiter);
      const director = createMusicDirector(0, 2026);
      let step = 0,
        eventId = 0;
      context.transport.bpm.value = MUSIC_BPM;
      context.transport.scheduleRepeat((time) => {
        const events: GameEvent[] = [];
        if (options.hits !== false && step % 14 === 4)
          events.push({
            id: eventId++,
            tick: step,
            type: "paddle",
            seat: 0,
            piece: null,
            position: { x: 0, y: 0 },
          });
        if (options.hits !== false && step === 144)
          events.push({
            id: eventId++,
            tick: step,
            type: "damage",
            seat: 0,
            piece: 0,
            position: { x: 0, y: 0 },
          });
        const cues = director.observe(
          {
            elapsed: time,
            balls: 1 + Math.min(3, Math.floor(time / 15)),
            alive: [true, true, true, true],
          },
          events,
        );
        instruments!.play(only(cues), time + 0.003);
        instruments!.play(only(director.step(step++)), time);
      }, "16n");
      context.transport.start(0);
    },
    duration,
    2,
    44100,
  );
  const channels = [audio.getChannelData(0), audio.getChannelData(1)];
  const sections = [
    { section: "intro", from: 0, to: 64 },
    { section: "groove", from: 64, to: 128 },
    { section: "breakdown", from: 128, to: 192 },
    { section: "build", from: 192, to: 256 },
    { section: "drop", from: 256, to: 384 },
    { section: "melodic", from: 384, to: 512 },
  ].map(({ section, from, to }) => {
    const start = Math.floor(((from * 60) / MUSIC_BPM / 4) * 44100),
      end = Math.min(channels[0]!.length, Math.floor(((to * 60) / MUSIC_BPM / 4) * 44100));
    let sum = 0;
    for (let i = start; i < end; i++) sum += channels[0]![i]! ** 2;
    return { section, rms: end > start ? Math.sqrt(sum / (end - start)) : 0 };
  });
  const encoded = encodeWave(channels, 44100);
  instruments?.dispose();
  limiter?.dispose();
  audio.dispose();
  return { ...encoded, duration, bpm: MUSIC_BPM, sections };
}
