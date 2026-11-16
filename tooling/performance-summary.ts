export interface BenchmarkFrame {
  intervalMs: number;
  simulationMs: number;
  audioMs: number;
  renderCpuMs: number;
  gpuMs: number | null;
  gpuSampleId?: number;
  gpuAgeMs?: number | null;
  resolutionScale: number;
  balls: number;
  calls: number;
}

/** Summarise only collected frames; an unavailable GPU timer is never treated as zero. */
export function summariseFrames(frames: readonly BenchmarkFrame[]) {
  const metrics = [
    "intervalMs",
    "simulationMs",
    "audioMs",
    "renderCpuMs",
    "gpuMs",
    "resolutionScale",
    "balls",
    "calls",
  ] as const;
  const seen = new Set<number>();
  const summary = Object.fromEntries(
    metrics.map((key) => {
      const values = frames
        .filter((frame) => {
          if (key !== "gpuMs") return true;
          if (frame.gpuMs === null || (frame.gpuAgeMs ?? 0) > 1000) return false;
          if (frame.gpuSampleId === undefined) return true;
          if (!frame.gpuSampleId || seen.has(frame.gpuSampleId)) return false;
          seen.add(frame.gpuSampleId);
          return true;
        })
        .map((frame) => frame[key])
        .filter((value): value is number => value !== null && Number.isFinite(value))
        .sort((a, b) => a - b);
      const percentile = (q: number) =>
        values.length ? values[Math.floor((values.length - 1) * q)]! : null;
      return [
        key,
        {
          samples: values.length,
          median: percentile(0.5),
          p95: percentile(0.95),
          p99: percentile(0.99),
          max: values.at(-1) ?? null,
        },
      ];
    }),
  );
  return {
    frames: frames.length,
    longFrames: frames.filter((frame) => frame.intervalMs > 33.4).length,
    metrics: summary,
  };
}
