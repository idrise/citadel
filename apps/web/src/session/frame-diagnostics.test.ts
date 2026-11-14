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
