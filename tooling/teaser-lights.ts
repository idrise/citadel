import { createMusicDirector } from "../apps/web/src/audio/director";
import { createBeatEnvelope } from "../apps/web/src/audio/beat-envelope";
import { arrangementAt } from "../apps/web/src/audio/arrangement";
import { SIXTEENTH } from "../apps/web/src/audio/music-types";

/** The separate score's real kick/pad envelopes still drive the game's normal bloom and grid. */
export function createTeaserLights() {
  const director = createMusicDirector(0, 2026),
    beats = createBeatEnvelope();
  let step = 0;
  return (time: number) => {
    while (step * SIXTEENTH <= time + 1e-8) {
      const at = step * SIXTEENTH;
      director.observe(
        {
          elapsed: at,
          balls: 1 + Math.min(3, Math.floor(at / 15)),
          alive: [true, true, true, true],
        },
        [],
      );
      const cues = director.step(step);
      beats.scheduleEnergy(at, arrangementAt(step).energy);
      for (const cue of cues) {
        if (cue.voice === "kick") beats.schedule(at, cue.velocity);
        else if (cue.voice === "pad" && !cues.some((item) => item.voice === "kick"))
          beats.schedule(at, 0.4);
      }
      step++;
    }
    return beats.frame(time);
  };
}
