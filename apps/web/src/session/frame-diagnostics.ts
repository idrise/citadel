export type FramePhase =
  | "title"
  | "countdown"
  | "playing"
  | "morph"
  | "finished"
  | "paused"
  | "hidden";
export interface FrameSample {
  intervalMs: number;
  simulationMs: number;
  audioMs: number;
  renderCpuMs: number;
  gpuMs: number | null;
  resolutionScale: number;
  level: number;
  balls: number;
  calls: number;
  atMs?: number;
  phase?: FramePhase;
  tick?: number;
  simulationSeconds?: number;
  frameCpuMs?: number;
  seats?: number;
  gpuSampleId?: number;
  gpuAgeMs?: number | null;
  geometries?: number;
  textures?: number;
  triangles?: number;
  drawingWidth?: number;
  drawingHeight?: number;
}
export interface DiagnosticMarker {
  atMs: number;
  type: string;
  tick?: number;
  detail?: string;
}
const metrics = [
  "intervalMs",
  "simulationMs",
  "audioMs",
  "renderCpuMs",
  "frameCpuMs",
  "gpuMs",
] as const;
export function summariseDiagnosticFrames(frames: readonly FrameSample[]) {
  const seen = new Set<number>();
  const values = Object.fromEntries(
    metrics.map((key) => {
      const rows =
        key === "gpuMs"
          ? frames.filter((frame) => {
              if (frame.gpuMs === null || (frame.gpuAgeMs ?? 0) > 1000) return false;
              if (frame.gpuSampleId === undefined) return true;
              if (!frame.gpuSampleId || seen.has(frame.gpuSampleId)) return false;
              seen.add(frame.gpuSampleId);
              return true;
            })
          : frames;
      const numbers = rows
        .map((frame) => frame[key])
        .filter((n): n is number => typeof n === "number" && Number.isFinite(n))
        .sort((a, b) => a - b);
      const q = (value: number) =>
        numbers.length ? numbers[Math.floor((numbers.length - 1) * value)]! : null;
      return [
        key,
        {
          samples: numbers.length,
          median: q(0.5),
          p95: q(0.95),
          p99: q(0.99),
          max: numbers.at(-1) ?? null,
        },
      ];
    }),
  );
  const stalls = Object.fromEntries(
    [33.4, 50, 100, 250].map((threshold) => {
      const slow = frames.filter((frame) => frame.intervalMs > threshold);
      return [
        String(threshold),
        { frames: slow.length, totalMs: slow.reduce((sum, f) => sum + f.intervalMs, 0) },
      ];
    }),
  );
  return {
    frames: frames.length,
    capturedMs: frames.reduce((sum, f) => sum + f.intervalMs, 0),
    metrics: values,
    stalls,
  };
}
/** Bounded local evidence. Phase attribution belongs to the frame that preceded its interval. */
export function createFrameDiagnostics(capacity = 1800) {
  if (!Number.isInteger(capacity) || capacity < 1)
    throw new Error("Diagnostic capacity must be a positive integer");
  const samples: (FrameSample | undefined)[] = Array.from({ length: capacity });
  const spikes: FrameSample[] = [],
    markers: DiagnosticMarker[] = [];
  let cursor = 0,
    size = 0,
    totalFrames = 0,
    totalSpikes = 0,
    longestMs = 0,
    totalMarkers = 0;
  return {
    record(sample: FrameSample) {
      if (!Number.isFinite(sample.intervalMs) || sample.intervalMs <= 0) return;
      const copy = { ...sample };
      samples[cursor] = copy;
      cursor = (cursor + 1) % capacity;
      size = Math.min(size + 1, capacity);
      totalFrames++;
      longestMs = Math.max(longestMs, sample.intervalMs);
      if (sample.intervalMs > 33.4) {
        totalSpikes++;
        spikes.push(copy);
        if (spikes.length > 64) spikes.shift();
      }
    },
    mark(marker: DiagnosticMarker) {
      if (!Number.isFinite(marker.atMs)) return;
      totalMarkers++;
      markers.push({ ...marker });
      if (markers.length > 128) markers.shift();
    },
    snapshot() {
      const recent = Array.from({ length: size }, (_, i) => ({
        ...samples[(cursor - size + i + capacity) % capacity]!,
      }));
      const active = recent.filter(
        (f) => f.phase === undefined || f.phase === "playing" || f.phase === "morph",
      );
      const summary = summariseDiagnosticFrames(active);
      const phases = Object.fromEntries(
        [...new Set(recent.map((f) => f.phase ?? "playing"))].map((phase) => [
          phase,
          summariseDiagnosticFrames(recent.filter((f) => (f.phase ?? "playing") === phase)),
        ]),
      );
      return {
        kind: "Local rolling frame diagnostics; nothing uploaded",
        totalFrames,
        totalSpikes,
        longestMs,
        windowFrames: size,
        intervalMs: summary.metrics.intervalMs!,
        simulationMs: summary.metrics.simulationMs!,
        audioMs: summary.metrics.audioMs!,
        renderCpuMs: summary.metrics.renderCpuMs!,
        gpuMs: summary.metrics.gpuMs!,
        summary,
        phases,
        totalMarkers,
        markers: markers.map((m) => ({ ...m })),
        spikes: spikes.map((f) => ({ ...f })),
        recent,
      };
    },
  };
}
export type FrameDiagnostics = ReturnType<ReturnType<typeof createFrameDiagnostics>["snapshot"]>;
