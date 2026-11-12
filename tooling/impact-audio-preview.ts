import * as Tone from "tone";
import { createInstruments } from "../apps/web/src/audio/tone-instruments";
import { createMusicDirector, MUSIC_BPM, SIXTEENTH } from "../apps/web/src/audio/director";
import { createEventConductor } from "../apps/web/src/audio/event-grid";
import { encodeWave } from "./pcm-wave";

/** Render authored bounce auditions through the shipped synth/mix graph at master 45%. */
export async function renderImpactAudio(kind: "wall" | "paddle" | "rally", legacy = false) {
  const duration = kind === "rally" ? 8 : 2.5;
  let instruments: ReturnType<typeof createInstruments> | undefined;
  let limiter: Tone.Limiter | undefined,
    compressor: Tone.Compressor | undefined,
    old: Tone.PolySynth | undefined;
  const buffer = await Tone.Offline(
    (context) => {
      context.destination.volume.value = 20 * Math.log10(0.45);
      limiter = new Tone.Limiter({ context, threshold: -3 }).toDestination();
      instruments = createInstruments(context, limiter);
      const director = createMusicDirector(0, 2026),
        conductor = createEventConductor();
      const frame = { elapsed: 70, balls: 4, alive: [true, true, true, true] };
      director.observe(frame, []);
      if (legacy) {
        compressor = new Tone.Compressor({
          context,
          threshold: -12,
          ratio: 2.5,
          attack: 0.008,
          release: 0.12,
        }).connect(limiter);
        old = new Tone.PolySynth({
          context,
          voice: Tone.FMSynth,
          maxPolyphony: 8,
          options:
            kind === "wall"
              ? {
                  volume: -13,
                  harmonicity: 1.5,
                  modulationIndex: 0.8,
                  envelope: { attack: 0.003, decay: 0.13, sustain: 0.06, release: 0.12 },
                  modulationEnvelope: { attack: 0.002, decay: 0.08, sustain: 0.05, release: 0.1 },
                }
              : {
                  volume: -12,
                  harmonicity: 2,
                  modulationIndex: 2,
                  envelope: { attack: 0.002, decay: 0.09, sustain: 0, release: 0.09 },
                },
        }).connect(compressor);
      }
      if (kind === "rally") {
        let step = 0,
          id = 0;
        context.transport.bpm.value = MUSIC_BPM;
        context.transport.scheduleRepeat((time) => {
          instruments!.play(director.step(256 + step), time);
          if (step % 4 === 1) {
            const cues = director.observe(frame, [
              {
                id: id++,
                tick: step,
                type: step % 8 === 1 ? "wall" : "paddle",
                seat: 0,
                piece: null,
                position: { x: 0, y: 0 },
              },
            ]);
            for (const planned of conductor.plan(cues, time + 0.005, { time, step: 256 + step }))
              instruments!.play([planned.cue], planned.time);
          }
          step++;
        }, "16n");
        context.transport.start(0);
      } else {
        for (let id = 0; id < 3; id++) {
          const time = 0.3 + id * 0.7;
          const cues = director.observe(frame, [
            { id, tick: id, type: kind, seat: 0, piece: null, position: { x: 0, y: 0 } },
          ]);
          if (legacy)
            old!.triggerAttackRelease(
              440 * 2 ** ((cues[0]!.note - 69) / 12),
              kind === "wall" ? 0.045 : 0.12,
              time,
              kind === "wall" ? 0.1 : 0.8,
            );
          else for (const cue of cues) instruments!.play([cue], time);
        }
      }
    },
    duration,
    2,
    44100,
  );
  const encoded = encodeWave([buffer.getChannelData(0), buffer.getChannelData(1)], 44100);
  instruments?.dispose();
  old?.dispose();
  compressor?.dispose();
  limiter?.dispose();
  buffer.dispose();
  return { ...encoded, duration, kind, legacy, master: 0.45, gridSeconds: SIXTEENTH / 2 };
}
