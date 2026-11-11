import { arrangementAt, HARMONY } from "./arrangement";
import { SIXTEENTH, type MusicCue } from "./music-types";
export function ballTier(balls: number) {
  return Math.max(1, Math.min(4, Math.floor(balls)));
}
export function harmonyNote(note: number, notes: readonly number[]) {
  const candidates = notes
    .flatMap((pitch) => [pitch - 12, pitch, pitch + 12, pitch + 24])
    .filter((pitch) => pitch <= note - 3 && pitch >= note - 9);
  return candidates.reduce(
    (best, pitch) => (Math.abs(pitch - (note - 4)) < Math.abs(best - (note - 4)) ? pitch : best),
    candidates[0] ?? note - 7,
  );
}

/** Distinct instrument identities, all following the current harmony rather than stacked random notes. */
export function addBallLayers(
  step: number,
  base: readonly MusicCue[],
  balls: number,
  streak: number,
): MusicCue[] {
  const a = arrangementAt(step),
    tier = ballTier(balls),
    p = a.position,
    chord = HARMONY[a.bar % 4]!;
  if (a.breath) return [];
  const space = a.section === "breakdown" || a.section === "melodic",
    out: MusicCue[] = [];
  if (tier >= 2) {
    for (const cue of base)
      if (cue.voice === "lead")
        out.push({
          voice: "harmony",
          note: harmonyNote(cue.note, chord.pad),
          velocity: 0.62,
          duration: cue.duration * 1.2,
          brightness: 0.55,
        });
    if (p === 0 && !base.some((c) => c.voice === "pad"))
      out.push({
        voice: "pad",
        note: chord.pad[0],
        notes: chord.pad,
        duration: SIXTEENTH * 14,
        velocity: 0.48,
        brightness: 0.6,
      });
  }
  if (tier >= 3 && p % 2 === 1) {
    const degree = [0, 2, 3, 5, 4, 3, 2, 1][Math.floor(p / 2)]!;
    out.push({
      voice: "arp",
      note: chord.scale[degree]! + 12,
      velocity: 0.4,
      duration: SIXTEENTH * 0.7,
      brightness: 0.8,
    });
  }
  if (tier >= 3 && !space && [1, 4, 7, 9, 12, 15].includes(p))
    out.push({
      voice: "acid",
      note: chord.bass + (p % 3 === 0 ? 12 : 0),
      velocity: 0.48,
      duration: SIXTEENTH * 0.75,
      brightness: 0.35 + ((p + Math.floor(step / 16)) % 5) * 0.13,
    });
  if (tier >= 4 && [0, 6, 10].includes(p))
    out.push({
      voice: "brass",
      note: chord.pad[0] + 12,
      notes: chord.pad.map((note) => note + 12),
      velocity: space ? 0.32 : 0.55,
      duration: SIXTEENTH * 1.6,
      brightness: 0.75,
    });
  if (streak >= 4 && p % 4 === 3)
    out.push({ voice: "hat", note: 0, velocity: 0.3, duration: 0.02 });
  if (streak >= 8 && p % 4 === 2)
    out.push({
      voice: "answer",
      note: chord.scale[(Math.floor(step / 2) + 2) % 7]! + 12,
      velocity: 0.4,
      duration: SIXTEENTH,
      brightness: 0.7,
    });
  if (streak >= 12 && p === 14)
    out.push({
      voice: "brass",
      note: chord.pad[0],
      notes: chord.pad.map((note) => note + 12),
      velocity: 0.4,
      duration: SIXTEENTH * 1.5,
      brightness: 0.9,
    });
  return out;
}
