import * as Tone from "tone";
import { createInstruments } from "../apps/web/src/audio/tone-instruments";
import { createMusicDirector, SIXTEENTH } from "../apps/web/src/audio/director";
import type { GameEvent } from "../apps/web/src/simulation/types";
import { encodeWave } from "./pcm-wave";

export const EFFECTS_REVIEW_CASES = [
  "wall",
  "paddle",
  "launch",
  "damage",
  "breach",
  "elimination",
  "collection",
  "supply",
  "victory",
  "swish",
  "swishSlow",
  "swishGesture",
  "swishGameMix",
  "swishRest",
  "swishFast",
  "swishMusic",
  "swishMuted",
  "music",
  "mixed",
  "stress",
  "stressMusic",
  "muted",
] as const;
export type EffectsReviewCase = (typeof EFFECTS_REVIEW_CASES)[number];
/** Real score and event cues, with the user's quiet-music/max-effects balance. */
export async function renderEffectsBalance(kind: EffectsReviewCase) {
  const duration =
    kind === "mixed" || kind === "swishGameMix" ? 8 : kind === "swishGesture" ? 5 : 2;
  let instruments: ReturnType<typeof createInstruments> | undefined;
  let limiter: Tone.Limiter | undefined;
  const buffer = await Tone.Offline(
    (context) => {
      limiter = new Tone.Limiter({ context, threshold: -3 }).toDestination();
      instruments = createInstruments(context, limiter);
      instruments.setMix(
        kind === "stressMusic" ? 1 : 0.2,
        kind === "muted" || kind === "swishMuted" ? 0 : 1,
        0,
      );
      const director = createMusicDirector(0, 2026);
      const frame = { elapsed: 70, balls: 4, alive: [true, true, true, true] };
      director.observe(frame, []);
      let id = 0;
      const play = (type: GameEvent["type"], time: number, seat = 0) => {
        const event: GameEvent = {
          id: id++,
          tick: id,
          type,
          seat,
          piece: null,
          position: { x: 0, y: 0 },
          attackerSeat: 0,
        };
        instruments!.play(director.observe(frame, [event]), time, "effects");
      };
      if (
        kind === "music" ||
        kind === "mixed" ||
        kind === "stressMusic" ||
        kind === "swishMusic" ||
        kind === "swishGameMix"
      )
        for (let step = 0; 0.1 + step * SIXTEENTH < duration - 0.5; step++)
          instruments!.play(director.step(256 + step), 0.1 + step * SIXTEENTH, "music");
      if (kind === "mixed" || kind === "swishGameMix") {
        play("launch", 0.4);
        play("wall", 0.9);
        play("paddle", 1.3);
        play("damage", 1.75);
        play("damage", 2.5, 1);
        play("collection", 3.3);
        play("elimination", 4.1, 1);
        play("supply", 4.9);
        play("victory", 5.7);
        if (kind === "mixed") {
          instruments.steer(3.2, 0.2, 0.4);
          instruments.steer(0, 0, 0.75);
        }
      } else if (kind === "stress" || kind === "stressMusic") {
        for (let i = 0; i < 16; i++) play(i % 2 ? "paddle" : "wall", 0.25 + i * 0.01);
        play("damage", 0.3);
        play("damage", 0.35, 1);
        play("elimination", 0.4, 1);
      } else if (
        kind === "swish" ||
        kind === "swishSlow" ||
        kind === "swishFast" ||
        kind === "swishMusic" ||
        kind === "swishMuted" ||
        kind === "swishRest"
      ) {
        instruments.steer(
          kind === "swishRest" ? 0 : kind === "swishFast" ? 16 : kind === "swishSlow" ? 1 : 3.2,
          0.2,
          0.25,
        );
        instruments.steer(0, 0, 0.65);
      } else if (kind !== "music" && kind !== "swishGesture") {
        play(
          kind === "muted" ? "paddle" : kind === "breach" ? "damage" : kind,
          0.25,
          kind === "breach" || kind === "elimination" ? 1 : 0,
        );
      }
      if (kind === "swishGesture" || kind === "swishGameMix") {
        // Slow brush, fast reverse flick, then several alternating strokes and a full stop.
        let position = 0;
        for (let frame = 0; frame < duration * 60; frame++) {
          const time = frame / 60;
          const strokeTime = time % 5;
          const velocity =
            strokeTime < 0.5 || strokeTime >= 4.2
              ? 0
              : strokeTime < 1.5
                ? 3.2 * Math.sin((strokeTime - 0.5) * Math.PI)
                : strokeTime < 2
                  ? 0
                  : strokeTime < 2.5
                    ? -16 * Math.sin((strokeTime - 2) * Math.PI * 2)
                    : strokeTime < 3
                      ? 0
                      : 10 * Math.sin((strokeTime - 3) * Math.PI * 4);
          position = Math.max(-1, Math.min(1, position + velocity / 60));
          instruments.steer(
            kind === "swishGameMix" && frame % 7 === 6 ? 0 : velocity,
            position,
            time,
          );
        }
      }
    },
    duration,
    2,
    44100,
  );
  const result = encodeWave([buffer.getChannelData(0), buffer.getChannelData(1)], 44100);
  instruments?.dispose();
  limiter?.dispose();
  buffer.dispose();
  return {
    kind,
    duration,
    music: kind === "stressMusic" ? 1 : 0.2,
    effects: kind === "muted" || kind === "swishMuted" ? 0 : 1,
    ...result,
  };
}
