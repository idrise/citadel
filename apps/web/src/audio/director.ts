import type { GameEvent } from "../simulation/types";

export const MUSIC_BPM = 138;
export const SIXTEENTH = 60 / MUSIC_BPM / 4;
export type Voice = "kick" | "bass" | "lead" | "hit" | "hat" | "damage" | "harmony";
export interface MusicCue {
  voice: Voice;
  note: number;
  duration: number;
  velocity: number;
}
export interface MusicFrame {
  elapsed: number;
  balls: number;
  alive: readonly boolean[];
}
interface Part {
  streak: number;
  phrase: number[];
}
const SCALE = [62, 65, 67, 69, 72, 74, 77]; // D minor pentatonic, shared by every seat.
const clamp = (value: number) => Math.max(0, Math.min(1, value));

/** Musical state only. It observes events, never changes match state or consumes match RNG. */
export function createMusicDirector(humanSeat: number, seed: number) {
  const parts: Part[] = Array.from({ length: 4 }, () => ({ streak: 0, phrase: [] }));
  let frame: MusicFrame = { elapsed: 0, balls: 1, alive: [true, true, true, true] };
  let lastEvent = -1;
  let section: "pulse" | "build" | "drop" = "pulse";
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
          cues.push(cue("hit", note, event.seat === humanSeat ? 0.8 : 0.3, 0.12));
        } else if (event.type === "damage") {
          part.streak = 0;
          part.phrase = [];
          cues.push(cue("damage", 38, event.seat === humanSeat ? 0.75 : 0.35, 0.3));
        }
      }
      return cues;
    },
    step(step: number): MusicCue[] {
      const part = parts[focus()]!;
      const cycle = Math.floor(step / 16) % 16;
      const drop = step >= 256 && cycle < 4;
      const build = cycle >= 12;
      section = drop ? "drop" : build ? "build" : "pulse";
      // A one-beat breath before each 16-bar drop. Musical only; gameplay continues.
      if (cycle === 15 && step % 16 >= 12) return [];
      const energy = intensity();
      const drive = drop || part.streak >= 4 || energy >= 0.3;
      const cues: MusicCue[] = [];
      if (step % 4 === 0) cues.push(cue("kick", 36, drop ? 0.95 : 0.8, 0.16));
      if (drive && [2, 5, 8, 10, 14].includes(step % 16)) {
        const note = [38, 38, 36, 33][Math.floor(step / 16) % 4]!;
        cues.push(cue("bass", note, drop ? 0.85 : 0.65, SIXTEENTH * 1.3));
      }
      if (step % (part.phrase.length > 3 || drop ? 2 : 4) === 0) {
        const note = part.phrase.length
          ? part.phrase[Math.floor(step / 2) % part.phrase.length]!
          : 62;
        cues.push(cue("lead", note, 0.32 + energy * 0.18, SIXTEENTH * 1.1));
        if ((part.streak >= 8 || drop) && step % 8 === 6)
          cues.push(cue("harmony", note + 12, 0.22, SIXTEENTH));
      }
      if ((drive || build) && step % (build ? 1 : 2) === 0)
        cues.push(
          cue("hat", 0, step % 4 === 2 ? 0.35 : 0.18 + (build ? (cycle - 12) * 0.035 : 0), 0.035),
        );
      return cues;
    },
    snapshot() {
      const seat = focus(),
        part = parts[seat]!;
      return {
        section,
        intensity: intensity(),
        streak: part.streak,
        notes: part.phrase.length,
        seat,
      };
    },
  };
}
export type MusicDirector = ReturnType<typeof createMusicDirector>;
