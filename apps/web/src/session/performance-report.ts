import type { BuildIdentity } from "../../../../tooling/build-identity";
import type { FrameDiagnostics } from "./frame-diagnostics";
import type { GameSettings } from "./settings";

export interface PerformanceContext {
  seed: number;
  supplySeed: number;
  tick: number;
  simulationSeconds: number;
  level: number;
  initialSeats: number;
  liveSeats: number;
  arenaShape: string;
  phase: string;
  paused: boolean;
  settings: GameSettings;
}
export function createPerformanceReport(input: {
  build: BuildIdentity;
  context: PerformanceContext;
  frames: FrameDiagnostics;
  audio: unknown;
  graphics: unknown;
  browser: unknown;
  capturedAt?: string;
}) {
  return {
    schema: "citadel.performance",
    version: 1,
    capturedAt: input.capturedAt ?? new Date().toISOString(),
    build: { ...input.build },
    context: { ...input.context, settings: { ...input.context.settings } },
    browser: input.browser,
    graphics: input.graphics,
    audio: input.audio,
    frames: input.frames,
    notes: [
      "Local diagnostic export; nothing is uploaded. Share only if you choose.",
      "Frame summaries separate active play from menus, pauses and hidden tabs.",
      "CPU submission and GPU work overlap; do not add their durations.",
      "GPU readings are sampled; missing, stale or disjoint readings are unknown.",
      "Audio scheduling counters do not measure native audio-buffer underruns or output-device glitches.",
      "Seeds and context are diagnostic information, not a complete input replay.",
    ],
  };
}
export function browserEnvironment() {
  return {
    userAgent: navigator.userAgent,
    language: navigator.language,
    hardwareConcurrency: navigator.hardwareConcurrency || null,
    path: window.location.origin + window.location.pathname,
    visibility: document.visibilityState,
    reportedDeviceModel: null,
    powerMode: null,
    audioOutputConnection: null,
    refreshRate: null,
  };
}
