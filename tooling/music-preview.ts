import * as Tone from "tone";
import { createMusicDirector, MUSIC_BPM } from "../apps/web/src/audio/director";
import { createInstruments } from "../apps/web/src/audio/tone-instruments";
import type { GameEvent } from "../apps/web/src/simulation/types";

/** Review fixture: repeated human hits grow a phrase, damage strips it, global clock still reaches a drop. */
export async function renderMusicPreview() {
  let instruments: ReturnType<typeof createInstruments> | undefined;
  let limiter: Tone.Limiter | undefined;
  const duration = 34;
  const audio = await Tone.Offline(
    (context) => {
      destinationVolume(context);
      limiter = new Tone.Limiter({ context, threshold: -3 }).toDestination();
      instruments = createInstruments(context, limiter);
      const director = createMusicDirector(0, 2026);
      let step = 0,
        eventId = 0;
      context.transport.bpm.value = MUSIC_BPM;
      context.transport.scheduleRepeat((time) => {
        const events: GameEvent[] = [];
        if (step % 10 === 4)
          events.push({
            id: eventId++,
            tick: step,
            type: "paddle",
            seat: 0,
            piece: null,
            position: { x: 0, y: 0 },
          });
        if (step === 144)
          events.push({
            id: eventId++,
            tick: step,
            type: "damage",
            seat: 0,
            piece: 0,
            position: { x: 0, y: 0 },
          });
        const cues = director.observe(
          { elapsed: time, balls: time > 15 ? 2 : 1, alive: [true, true, true, true] },
          events,
        );
        instruments!.play(cues, time + 0.003);
        instruments!.play(director.step(step++), time);
      }, "16n");
      context.transport.start(0);
    },
    duration,
    1,
    44100,
  );
  const samples = audio.getChannelData(0);
  const pcm = new Uint8Array(44 + samples.length * 2),
    view = new DataView(pcm.buffer);
  const label = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i++) pcm[offset + i] = value.charCodeAt(i);
  };
  label(0, "RIFF");
  view.setUint32(4, pcm.length - 8, true);
  label(8, "WAVEfmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, 44100, true);
  view.setUint32(28, 88200, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  label(36, "data");
  view.setUint32(40, samples.length * 2, true);
  let peak = 0,
    energy = 0;
  for (let i = 0; i < samples.length; i++) {
    const sample = samples[i]!;
    peak = Math.max(peak, Math.abs(sample));
    energy += sample * sample;
    view.setInt16(44 + i * 2, Math.round(Math.max(-1, Math.min(1, sample)) * 32767), true);
  }
  let encoded = "";
  for (let i = 0; i < pcm.length; i += 16384)
    encoded += String.fromCharCode(...pcm.subarray(i, i + 16384));
  instruments?.dispose();
  limiter?.dispose();
  audio.dispose();
  return {
    wav: btoa(encoded),
    duration,
    peak,
    rms: Math.sqrt(energy / samples.length),
    bpm: MUSIC_BPM,
  };
}
function destinationVolume(context: Tone.OfflineContext) {
  context.destination.volume.value = 20 * Math.log10(0.45);
}
