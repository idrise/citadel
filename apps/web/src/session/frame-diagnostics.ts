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
}
/** Bounded local evidence: CPU submission is distinct from asynchronous GPU duration. */
export function createFrameDiagnostics(capacity = 1800) {
  const samples: (FrameSample | undefined)[] = Array.from({ length: capacity });
  const spikes: FrameSample[] = [];
  let cursor = 0,
    size = 0,
    totalFrames = 0,
    totalSpikes = 0,
    longestMs = 0;
  return {
    record(sample: FrameSample) {
      if (!Number.isFinite(sample.intervalMs) || sample.intervalMs <= 0) return;
      samples[cursor] = { ...sample };
      cursor = (cursor + 1) % capacity;
      size = Math.min(size + 1, capacity);
      totalFrames++;
      longestMs = Math.max(longestMs, sample.intervalMs);
      if (sample.intervalMs > 33.4) {
        totalSpikes++;
        spikes.push({ ...sample });
        if (spikes.length > 64) spikes.shift();
      }
    },
    snapshot() {
      const recent = Array.from({ length: size }, (_, i) => ({
        ...samples[(cursor - size + i + capacity) % capacity]!,
      }));
      const metric = (key: keyof FrameSample) => {
        const values = recent
          .map((s) => s[key])
          .filter((v): v is number => v !== null)
          .sort((a, b) => a - b);
        const quantile = (q: number) =>
          values.length ? values[Math.floor((values.length - 1) * q)]! : null;
        return { median: quantile(0.5), p95: quantile(0.95), p99: quantile(0.99) };
      };
      return {
        kind: "Local rolling frame diagnostics; nothing uploaded",
        totalFrames,
        totalSpikes,
        longestMs,
        windowFrames: size,
        intervalMs: metric("intervalMs"),
        simulationMs: metric("simulationMs"),
        audioMs: metric("audioMs"),
        renderCpuMs: metric("renderCpuMs"),
        gpuMs: metric("gpuMs"),
        spikes: spikes.map((s) => ({ ...s })),
        recent,
      };
    },
  };
}
