import { HARMONY } from "./arrangement";
import { SIXTEENTH, type MusicCue } from "./music-types";

export interface GridAnchor {
  time: number;
  step: number;
}
export interface TimedCue {
  cue: MusicCue;
  time: number;
  step: number;
}
/** A shared audio-clock grid; anchors can move on resume without changing simulation time. */
export function nextGrid(now: number, anchor: GridAnchor, steps = 0.5) {
  const index = Math.ceil(((now - anchor.time) / SIXTEENTH + anchor.step) / steps - 1e-9) * steps;
  return { time: anchor.time + (index - anchor.step) * SIXTEENTH, step: index };
}
function inHarmony(note: number, step: number) {
  const chord = HARMONY[((Math.floor(step / 16) % 4) + 4) % 4]!;
  const tones = chord.scale.flatMap((pitch) => [pitch - 12, pitch, pitch + 12]);
  return tones.reduce((best, pitch) =>
    Math.abs(pitch - note) < Math.abs(best - note) ? pitch : best,
  );
}

/** Short impacts snap to 32nds (<=55ms); vocal/arrival responses use the following eighth. */
export function createEventConductor() {
  let lastCrowd = -Infinity,
    lastTic = -Infinity;
  const lastGesture = new Map<string, number>();
  return {
    plan(cues: readonly MusicCue[], now: number, anchor: GridAnchor): TimedCue[] {
      const result: TimedCue[] = [];
      for (const source of cues) {
        const grid = nextGrid(
          now + 0.005,
          anchor,
          ["cheer", "unlock", "success", "victory"].includes(source.voice) ? 2 : 0.5,
        );
        const spacing =
          source.voice === "damage"
            ? 0.5
            : source.voice === "ricochet"
              ? 2
              : source.voice === "serve"
                ? 1
                : source.voice === "success"
                  ? 2
                  : 0;
        if (
          spacing &&
          grid.time - (lastGesture.get(source.voice) ?? -Infinity) < SIXTEENTH * spacing - 1e-7
        )
          continue;
        if (spacing) lastGesture.set(source.voice, grid.time);
        const chord = HARMONY[((Math.floor(grid.step / 16) % 4) + 4) % 4]!;
        if (source.voice === "cheer") {
          if (grid.time - lastCrowd < SIXTEENTH * 8) continue;
          lastCrowd = grid.time;
          result.push({
            cue: {
              ...source,
              note: chord.bass + 12,
              notes: [chord.bass + 12, chord.bass + 19, chord.bass + 24],
            },
            ...grid,
          });
        } else if (source.voice === "success" || source.voice === "victory") {
          result.push({
            cue: {
              ...source,
              notes:
                source.voice === "victory"
                  ? [chord.scale[0] + 12, chord.scale[3] + 12, chord.scale[5] + 12]
                  : [chord.scale[3], chord.scale[5], chord.scale[6]],
            },
            ...grid,
          });
        } else if (source.voice === "unlock") {
          result.push({
            cue: {
              ...source,
              note: chord.scale[0],
              notes: [chord.scale[0], chord.scale[2], chord.scale[4]],
            },
            ...grid,
          });
        } else {
          if (source.voice === "hit" && grid.time - now > 0.025 && now - lastTic > 0.012) {
            result.push({
              cue: { voice: "tic", note: 0, velocity: source.velocity * 0.18, duration: 0.012 },
              time: now + 0.005,
              step: grid.step,
            });
            lastTic = now;
          }
          result.push({
            cue: {
              ...source,
              note: source.voice === "damage" ? chord.bass + 12 : inHarmony(source.note, grid.step),
            },
            ...grid,
          });
          if (source.voice === "hit" && source.velocity > 0.6) {
            const answer = nextGrid(grid.time + 0.001, anchor, 2);
            result.push({
              cue: {
                voice: "answer",
                note: inHarmony(source.note + 7, answer.step),
                duration: SIXTEENTH * 1.3,
                velocity: 0.28,
              },
              ...answer,
            });
          }
        }
      }
      // Dense collisions become a bounded musical gesture, never an unbounded future queue.
      return result.sort((a, b) => a.time - b.time).slice(0, 32);
    },
    reset() {
      lastGesture.clear();
      lastCrowd = -Infinity;
      lastTic = -Infinity;
    },
  };
}
