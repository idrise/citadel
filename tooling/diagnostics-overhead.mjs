import { performance } from "node:perf_hooks";
import { createFrameDiagnostics } from "../apps/web/src/session/frame-diagnostics.ts";
const iterations = 500000;
const sample = {
  intervalMs: 16.7,
  simulationMs: 0.2,
  audioMs: 0.1,
  renderCpuMs: 4,
  gpuMs: null,
  resolutionScale: 1,
  level: 1,
  balls: 16,
  calls: 300,
  phase: "playing",
  atMs: 0,
  tick: 0,
  simulationSeconds: 0,
  seats: 6,
  gpuSampleId: 0,
  gpuAgeMs: null,
  geometries: 40,
  textures: 10,
  triangles: 50000,
  drawingWidth: 1280,
  drawingHeight: 900,
  frameCpuMs: 5,
};
const results = [];
for (let round = 0; round < 5; round++) {
  for (const enabled of round % 2 ? [true, false] : [false, true]) {
    const recorder = createFrameDiagnostics();
    const start = performance.now();
    let sum = 0;
    for (let i = 0; i < iterations; i++) {
      sample.tick = i;
      sum += sample.tick;
      if (enabled) recorder.record(sample);
    }
    const elapsed = performance.now() - start;
    const snapshotStart = performance.now();
    recorder.snapshot();
    results.push({
      round,
      enabled,
      iterations,
      totalMs: elapsed,
      microsecondsPerFrame: (elapsed * 1000) / iterations,
      snapshotMs: performance.now() - snapshotStart,
      checksum: sum,
    });
  }
}
console.log(
  JSON.stringify(
    {
      kind: "Isolated Node recorder microbenchmark; not whole-game or affected-device performance",
      results,
    },
    null,
    2,
  ),
);
