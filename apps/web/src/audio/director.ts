import type { GameEvent } from "../simulation/types";

import { arrangementAt } from "./arrangement";
import { composeStep } from "./score";
import { ballTier } from "./ball-layers";
import { SIXTEENTH, type MusicFrame, type MusicCue, type Voice } from "./music-types";
export { MUSIC_BPM, SIXTEENTH } from "./music-types";
export type { MusicCue, MusicFrame } from "./music-types";

interface Part {
  streak: number;
  phrase: number[];
}
const SCALE = [62, 65, 67, 69, 72, 74, 77]; // D minor pentatonic, shared by every seat.
const clamp = (value: number) => Math.max(0, Math.min(1, value));

/** Musical state only. It observes events, never changes match state or consumes match RNG. */
export function createMusicDirector(humanSeat: number, seed: number) {
  const parts: Part[] = Array.from({ length: 6 }, () => ({ streak: 0, phrase: [] }));
  let frame: MusicFrame = { elapsed: 0, balls: 1, alive: Array<boolean>(6).fill(true) };
  let lastEvent = -1;
  let musicalStep = 0;
  let activeBalls = 1;
  const focus = () => {
    if (frame.alive[humanSeat]) return humanSeat;
    return parts.reduce(
      (best, part, seat) => (frame.alive[seat] && part.streak > parts[best]!.streak ? seat : best),
      frame.alive.findIndex(Boolean) < 0 ? humanSeat : frame.alive.findIndex(Boolean),
    );
  };
  const intensity = () => clamp(frame.elapsed / 100 + Math.max(0, frame.balls - 1) * 0.13);
  const cue = (
    voice: Voice,
    note: number,
    velocity: number,
    duration = SIXTEENTH * 0.75,
  ): MusicCue => ({ voice, note, duration, velocity });
  return {
    observe(next: MusicFrame, events: readonly GameEvent[]): MusicCue[] {
      frame = next;
      const cues: MusicCue[] = [];
      for (const event of events) {
        if (event.id <= lastEvent) continue;
        lastEvent = event.id;
        if (event.type === "wall") {
          cues.push(cue("ricochet", 74, 0.65, 0.045));
          continue;
        }
        if (event.type === "launch")
          cues.push(cue("serve", 69, event.seat === humanSeat ? 0.38 : 0.12, 0.1));
        if (event.type === "victory" && event.seat === humanSeat) {
          cues.push(cue("victory", 86, 0.8, 1.2));
          cues.push(cue("cheer", 62, 0.9, 1.15));
        }
        if (event.type === "elimination")
          cues.push(
            cue(
              "eliminate",
              event.seat === humanSeat ? 38 : 81,
              event.seat === humanSeat ? 0.5 : 0.22,
              0.35,
            ),
          );
        if (event.type === "arrival") cues.push(cue("unlock", 74, 0.55, 0.35));
        const part = parts[event.seat];
        if (!part) continue;
        if (event.type === "paddle") {
          part.streak++;
          const direction = event.impact?.outgoing ?? { x: 1, y: 0 };
          const placement = Math.floor(
            ((Math.atan2(direction.y, direction.x) + Math.PI) / (2 * Math.PI)) * 7,
          );
          const note =
            SCALE[((seed >>> 0) + event.seat * 3 + part.streak * 5 + placement) % SCALE.length]!;
          if (part.phrase.length < 16) part.phrase.push(note);
          else part.phrase[(part.streak - 1) % 16] = note;
          cues.push(cue("hit", note, event.seat === humanSeat ? 0.95 : 0.65, 0.12));
        } else if (event.type === "damage") {
          part.streak = 0;
          part.phrase = [];
          if (event.seat === humanSeat) cues.push(cue("damage", 50, 0.95, 0.65));
          else {
            // Every rival capsule needs its own reliable break cue. Wall ticks
            // share a throttle and could previously swallow an unrelated breach.
            cues.push(cue("breach", 79, event.attackerSeat === humanSeat ? 0.85 : 0.6, 0.12));
            if (event.attackerSeat === humanSeat) {
              cues.push(cue("success", 81, 0.8, 0.55));
              cues.push(cue("cheer", 62, 0.9, 1.15));
            }
          }
        }
      }
      return cues;
    },
    step(step: number): MusicCue[] {
      musicalStep = step;
      if (step % 16 === 0) activeBalls = ballTier(frame.balls);
      const part = parts[focus()]!;
      return composeStep(step, part.phrase, part.streak, intensity(), activeBalls);
    },
    snapshot() {
      const seat = focus(),
        part = parts[seat]!;
      return {
        section: arrangementAt(musicalStep).section,
        energy: arrangementAt(musicalStep).energy,
        intensity: intensity(),
        streak: part.streak,
        notes: part.phrase.length,
        layers: activeBalls,
        seat,
      };
    },
  };
}
export type MusicDirector = ReturnType<typeof createMusicDirector>;
