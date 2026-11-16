import { MUSIC_LOOK_AHEAD } from "../audio/schedule-window";
import type { DiagnosticRendering } from "../rendering/viewport";
import type { Scenario } from "./scenario";

export interface Comparison extends Scenario {
  comparison: "quality" | "audio" | "custom" | "soak";
  change:
    | "scale"
    | "bloom"
    | "floorReflection"
    | "wallReflections"
    | "drawing"
    | "audio"
    | "balanced";
  reverse: boolean;
  staticAudio: boolean;
}
export interface Pass {
  id: string;
  quality: "high" | "low";
  draw: boolean;
  audio: boolean;
  lookAhead: number;
  latencyHint: AudioContextLatencyCategory;
  stallMs: number;
  warmupSeconds: number;
  seconds: number;
  rendering: DiagnosticRendering;
}
export function comparisonPasses(config: Comparison, seconds?: number): Pass[] {
  if (seconds !== undefined && (!Number.isFinite(seconds) || seconds < 1 || seconds > 600))
    throw new Error("Duration must be 1–600 seconds");
  const reference: Pass = {
    id: "high-reference",
    quality: "high",
    draw: true,
    audio: true,
    lookAhead: MUSIC_LOOK_AHEAD,
    latencyHint: "interactive",
    stallMs: 0,
    warmupSeconds: seconds === undefined ? 5 : 0.5,
    seconds: seconds ?? 60,
    rendering: {
      fixedScale: 1,
      bloom: true,
      floorReflection: true,
      wallReflections: true,
    },
  };
  const changed = { ...reference, rendering: { ...reference.rendering } };
  if (config.comparison === "soak")
    return [{ ...reference, id: "repeated-matches", seconds: seconds ?? 600 }];
  if (config.comparison === "quality") {
    changed.id = "low";
    changed.quality = "low";
  } else if (config.comparison === "audio") {
    reference.id = "music-40ms";
    reference.lookAhead = 0.04;
    reference.seconds = seconds ?? 25;
    reference.stallMs = 80;
    reference.draw = !config.staticAudio;
    Object.assign(changed, {
      id: `music-${MUSIC_LOOK_AHEAD * 1000}ms`,
      seconds: reference.seconds,
      stallMs: 80,
      draw: reference.draw,
    });
  } else {
    changed.id = config.change;
    switch (config.change) {
      case "scale":
        changed.rendering.fixedScale = 0.5;
        break;
      case "drawing":
        changed.draw = false;
        break;
      case "audio":
        changed.audio = false;
        break;
      case "balanced":
        changed.latencyHint = "balanced";
        break;
      default:
        changed.rendering[config.change] = false;
    }
  }
  return config.reverse ? [changed, reference] : [reference, changed];
}
