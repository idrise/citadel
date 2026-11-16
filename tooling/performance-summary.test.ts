import { expect, it } from "vite-plus/test";
import { summariseFrames, type BenchmarkFrame } from "./performance-summary";

const frame = (intervalMs: number, gpuMs: number | null): BenchmarkFrame => ({
  intervalMs,
  gpuMs,
  simulationMs: 2,
  audioMs: 1,
  renderCpuMs: 3,
  resolutionScale: 1,
  balls: 4,
  calls: 100,
});

it("reports frame tails and preserves missing GPU measurements", () => {
  const result = summariseFrames([frame(16, null), frame(17, 3), frame(40, null), frame(50, 5)]);
  expect(result.frames).toBe(4);
  expect(result.longFrames).toBe(2);
  expect(result.metrics.intervalMs).toEqual({ samples: 4, median: 17, p95: 40, p99: 40, max: 50 });
  expect(result.metrics.gpuMs).toEqual({ samples: 2, median: 3, p95: 3, p99: 3, max: 5 });
});

it("handles an empty capture and ignores non-finite metrics", () => {
  expect(summariseFrames([]).metrics.gpuMs).toEqual({
    samples: 0,
    median: null,
    p95: null,
    p99: null,
    max: null,
  });
  expect(summariseFrames([frame(16, NaN)]).metrics.gpuMs!.samples).toBe(0);
});
it("deduplicates asynchronous GPU samples and excludes stale or invalid query results", () => {
  const base = frame(16, 5);
  const frames = [
    { ...base, gpuSampleId: 0 },
    { ...base, gpuSampleId: 1, gpuAgeMs: 0 },
    { ...base, gpuSampleId: 1, gpuAgeMs: 16 },
    { ...base, gpuSampleId: 2, gpuAgeMs: 1001, gpuMs: 1000 },
    { ...base, gpuSampleId: 3, gpuAgeMs: 10, gpuMs: 9 },
  ];
  expect(summariseFrames(frames).metrics.gpuMs).toMatchObject({ samples: 2, median: 5, max: 9 });
});
