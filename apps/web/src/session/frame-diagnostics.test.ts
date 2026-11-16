import { expect, it } from "vite-plus/test";
import { createFrameDiagnostics } from "./frame-diagnostics";
it("bounds evidence, retains stall counts and returns independent local snapshots", () => {
  const diagnostics = createFrameDiagnostics(120);
  for (let i = 0; i < 200; i++)
    diagnostics.record({
      intervalMs: i === 50 ? 400 : 16.7,
      simulationMs: 2,
      audioMs: 1,
      renderCpuMs: 4,
      gpuMs: null,
      resolutionScale: 1,
      level: 7,
      balls: 2,
      calls: 100,
    });
  const report = diagnostics.snapshot();
  expect(report.totalFrames).toBe(200);
  expect(report.windowFrames).toBe(120);
  expect(report.totalSpikes).toBe(1);
  expect(report.longestMs).toBe(400);
  expect(report.intervalMs.p99).toBe(16.7);
  expect(report.gpuMs.p95).toBeNull();
  report.spikes[0]!.level = 100;
  report.recent[0]!.level = 100;
  expect(diagnostics.snapshot().spikes[0]!.level).toBe(7);
  expect(diagnostics.snapshot().recent[0]!.level).toBe(7);
});

it("separates pause/hidden/startup from play and morph summaries and preserves bounded markers", () => {
  const recorder = createFrameDiagnostics(10);
  const base = {
    intervalMs: 16,
    simulationMs: 2,
    audioMs: 1,
    renderCpuMs: 3,
    gpuMs: null,
    resolutionScale: 1,
    level: 1,
    balls: 4,
    calls: 100,
  };
  for (const phase of [
    "title",
    "countdown",
    "playing",
    "morph",
    "paused",
    "hidden",
    "finished",
  ] as const)
    recorder.record({
      ...base,
      phase,
      intervalMs: phase === "playing" ? 110 : phase === "morph" ? 55 : 1000,
    });
  for (let i = 0; i < 200; i++) recorder.mark({ atMs: i, type: "resize", detail: String(i) });
  const report = recorder.snapshot();
  expect(report.summary.frames).toBe(2);
  expect(report.summary.capturedMs).toBe(165);
  expect(report.intervalMs.max).toBe(110);
  expect(report.phases.paused?.capturedMs).toBe(1000);
  expect(report.summary.stalls["100"]).toEqual({ frames: 1, totalMs: 110 });
  expect(report.totalMarkers).toBe(200);
  expect(report.markers).toHaveLength(128);
  report.markers[0]!.detail = "mutated";
  expect(recorder.snapshot().markers[0]?.detail).toBe("72");
  // The snapshot taken before Pause remains intact while menu frames replace the live window.
  for (let i = 0; i < 20; i++) recorder.record({ ...base, phase: "paused" });
  expect(recorder.snapshot().summary.frames).toBe(0);
  expect(report.summary.frames).toBe(2);
});
it("counts only unique fresh GPU samples and never treats unsupported timers as zero", () => {
  const recorder = createFrameDiagnostics();
  const base = {
    intervalMs: 16,
    simulationMs: 2,
    audioMs: 1,
    renderCpuMs: 3,
    gpuMs: 5,
    resolutionScale: 1,
    level: 1,
    balls: 4,
    calls: 100,
  };
  recorder.record({ ...base, gpuSampleId: 0 });
  recorder.record({ ...base, gpuSampleId: 1, gpuAgeMs: 0 });
  recorder.record({ ...base, gpuSampleId: 1, gpuAgeMs: 16 });
  recorder.record({ ...base, gpuSampleId: 2, gpuAgeMs: 1500, gpuMs: 999 });
  recorder.record({ ...base, gpuSampleId: 3, gpuAgeMs: null, gpuMs: null });
  recorder.record({ ...base, gpuSampleId: 4, gpuAgeMs: 10, gpuMs: 9 });
  recorder.record({ ...base, intervalMs: NaN });
  expect(recorder.snapshot().gpuMs).toMatchObject({ samples: 2, median: 5, max: 9 });
  expect(recorder.snapshot().windowFrames).toBe(6);
});
it("rejects invalid recorder capacity rather than silently losing evidence", () => {
  for (const capacity of [0, -1, 1.5, NaN, Infinity])
    expect(() => createFrameDiagnostics(capacity)).toThrow();
});
