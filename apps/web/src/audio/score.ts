import { barFeel, isHomeBar, melodyAt } from "./phrasing";
import { addBallLayers, harmonyNote } from "./ball-layers";
import { arrangementAt, harmonyAt } from "./arrangement";
import { SIXTEENTH, type MusicCue, type Voice } from "./music-types";

export function composeStep(
  step: number,
  phrase: readonly number[],
  streak: number,
  pressure: number,
  balls = 1,
  variant = 0,
): MusicCue[] {
  const a = arrangementAt(step),
    p = a.position;
  const cue = (
    voice: Voice,
    note: number,
    velocity: number,
    duration = SIXTEENTH * 0.8,
    brightness = 0.6,
  ): MusicCue => ({ voice, note, velocity, duration, brightness });
  if (a.breath) return p === 12 ? [cue("breath", 0, 0, 4 * SIXTEENTH)] : [];
  const out: MusicCue[] = [];
  if (p === 0) out.push(cue("open", 0, 0));
  const chord = harmonyAt(a.bar, variant);
  const feel = barFeel(a.bar, variant),
    home = isHomeBar(a.bar);
  const drop = a.section === "drop",
    build = a.section === "build",
    space = a.section === "breakdown" || a.section === "melodic";
  const bright = drop ? 1 : build ? 0.25 + a.progress * 0.75 : space ? 0.65 : 0.5;
  if (a.section === "intro") {
    if (p % 2 === 0) out.push(cue("mutedHat", 0, p % 4 === 0 ? 0.3 : 0.2, 0.018));
    if (a.bar >= 2 && [4, 12].includes(p))
      out.push(cue("snare", 0, a.bar === 2 ? 0.28 : 0.42, 0.05, 0.2));
    if (a.bar >= 2 && [0, 6, 12].includes(p))
      out.push(cue("lead", chord.scale[p === 6 ? 3 : 0], 0.46, SIXTEENTH * 1.5, 0.25));
    if (a.bar >= 3 && p === 8) out.push(cue("bass", chord.bass, 0.45, SIXTEENTH * 2, 0.15));
    if (phrase.length && p % 4 === 0)
      out.push(
        cue("player", phrase[Math.floor(step / 4) % phrase.length]!, 0.5, SIXTEENTH * 1.5, 0.3),
      );
    return [...out, ...addBallLayers(step, out, balls, streak, variant)];
  }
  const kick = !space && (!build || a.progress > 0.5);
  if (kick && p % 4 === 0) out.push(cue("kick", 26, drop ? 0.95 : 0.8, 0.24));
  if (
    !space &&
    (!build || a.progress < 0.75) &&
    (([0, 3, 6, 8, 10, 14].includes(p) && a.bar % 4 < 2) ||
      ([0, 2, 7, 8, 11, 15].includes(p) && a.bar % 4 >= 2))
  ) {
    const octave = p === 6 || p === 14 ? 12 : 0;
    out.push(
      cue(
        "bass",
        chord.bass + octave,
        drop ? 0.82 : 0.7,
        SIXTEENTH * (p === 8 ? 1.6 : 1.2),
        bright,
      ),
    );
    if (octave === 0) out.push(cue("sub", chord.bass - 12, 0.5, SIXTEENTH * 1.5));
  }
  // Returns preserve the original notes/rhythm while the surrounding bars develop.
  const theme = melodyAt(a.bar, variant),
    degree: number = theme[p]!;
  if (degree >= 0 && (!build || a.progress < 0.75 || p % 2 === 0)) {
    const note = chord.scale[degree]!;
    out.push({
      ...cue(
        "lead",
        note,
        drop ? 0.9 : space ? 0.82 : 0.72,
        SIXTEENTH * (space ? 2 : 1.6) * feel.articulation,
        Math.max(0, Math.min(1, bright + feel.brightness)),
      ),
      pan: feel.pan,
      echo: feel.echo,
      notes: drop ? [note, note - 12] : [note],
    });
  }
  const lead = out.find((item) => item.voice === "lead");
  // Sparse, quiet harmony can support the tune even before the second ball unlocks its full layer.
  if (balls < 2 && lead && (home || feel.accompaniment === "harmony") && (p % 4 === 0 || p === 14))
    out.push(cue("harmony", harmonyNote(lead.note, chord.pad), 0.27, lead.duration * 1.1, 0.45));
  if (!build && !space) {
    if (balls < 3 && feel.accompaniment === "bells" && [7, 15].includes(p))
      out.push(cue("arp", chord.scale[p === 7 ? 2 : 0] + 12, 0.22, SIXTEENTH * 0.7, 0.6));
    if (feel.accompaniment === "answer" && p === 15)
      out.push(cue("answer", chord.scale[(a.bar + 2) % 7]!, 0.24, SIXTEENTH * 1.25, 0.45));
    if (balls < 4 && feel.accompaniment === "brass" && p === 10)
      out.push(cue("brass", chord.pad[1]!, 0.2, SIXTEENTH * 1.5, 0.45));
  }
  if (p === 0 && (space || drop || a.section === "groove"))
    out.push({
      ...cue("pad", chord.pad[0]!, space ? 0.65 : 0.38, SIXTEENTH * 14, bright),
      notes: chord.pad,
    });
  if (phrase.length && p % 2 === 0) {
    out.push(
      cue(
        "player",
        phrase[Math.floor(step / 2) % phrase.length]!,
        0.4 + Math.min(streak, 16) * 0.012,
        SIXTEENTH,
        bright,
      ),
    );
  }
  if (!space && p % 2 === 0) out.push(cue("hat", 0, p % 4 === 2 ? 0.55 : 0.25, 0.035));
  if ((drop || a.section === "groove") && p % 4 === 2) out.push(cue("openHat", 0, 0.4, 0.12));
  if ((drop || a.section === "groove") && [4, 12].includes(p)) out.push(cue("clap", 0, 0.66, 0.11));
  // Four/eight-bar answers and fills make long rounds develop rather than repeat a short loop.
  if (!build && a.bar % 8 === 7 && [11, 14, 15].includes(p))
    out.push(cue("snare", 0, p === 15 ? 0.5 : 0.28, 0.04, bright));
  if (space && a.bar % 4 >= 2 && [3, 10, 14].includes(p))
    out.push(cue("answer", chord.scale[(p + a.bar) % 7]! - 12, 0.42, SIXTEENTH * 2.5, 0.4));
  if (build) {
    const spacing = a.progress < 0.45 ? 4 : a.progress < 0.78 ? 2 : 1;
    if (p % spacing === 0)
      out.push(cue("snare", 0, 0.3 + a.progress * 0.5, 0.055, 0.3 + a.progress * 0.7));
    if (p % 4 === 0)
      out.push(cue("riser", 0, 0.25 + a.progress * 0.5, SIXTEENTH * 3.9, a.progress));
  }
  if (a.first && drop) out.push(cue("crash", 0, 0.6, 1.2));
  if (drop && pressure > 0.5 && streak < 4 && p === 15) out.push(cue("hat", 0, 0.32, 0.04));
  return [...out, ...addBallLayers(step, out, balls, streak, variant)];
}
