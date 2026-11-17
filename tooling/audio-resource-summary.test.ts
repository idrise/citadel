import { expect, it } from "vite-plus/test";
import { summariseAudioResources, type AudioResourceSample } from "./audio-resource-summary";
const sample = (values: Partial<AudioResourceSample> = {}): AudioResourceSample => ({
  contextId: "interactive",
  callbackBufferSize: 480,
  sampleRate: 48000,
  renderCapacity: 0.25,
  callbackIntervalMean: 0.01,
  callbackIntervalVariance: 0.000004,
  inspectedNodes: 100,
  inspectedParams: 200,
  ...values,
});
it("converts Chromium's actual capacity ratio to percent and reports native callback budget and jitter", () => {
  const report = summariseAudioResources([
    sample(),
    sample({ renderCapacity: 1.1, inspectedNodes: 150 }),
  ]);
  expect(report[0]).toMatchObject({
    samples: 2,
    callbackBufferMs: { median: 10 },
    renderCapacityPercent: { median: 25, max: expect.closeTo(110) },
    callbackIntervalMs: { median: 10 },
    callbackJitterMs: { median: 2 },
    samplesAtOrAboveCapacity: 1,
    peakInspectedNodes: 150,
  });
});
it("keeps separately constructed contexts apart, including latency hints the browser ignores", () => {
  const report = summariseAudioResources([
    sample(),
    sample({ contextId: "balanced", callbackBufferSize: 480 }),
    sample({ contextId: "playback", callbackBufferSize: 1920 }),
  ]);
  expect(report.map((row) => row.callbackBufferMs.median)).toEqual([10, 10, 40]);
  expect(report.map((row) => row.contextId)).toEqual(["interactive", "balanced", "playback"]);
});
it("keeps missing or invalid readings unknown instead of interpreting them as spare capacity", () => {
  expect(summariseAudioResources([])).toEqual([]);
  const report = summariseAudioResources([
    sample({
      renderCapacity: NaN,
      sampleRate: 0,
      callbackIntervalMean: Infinity,
      callbackIntervalVariance: -1,
    }),
    sample({
      renderCapacity: -1,
      callbackBufferSize: Infinity,
      callbackIntervalMean: -1,
      callbackIntervalVariance: NaN,
    }),
  ])[0]!;
  expect(report.callbackBufferMs.samples).toBe(0);
  expect(report.callbackBufferMs.median).toBeNull();
  expect(report.renderCapacityPercent.median).toBeNull();
  expect(report.callbackIntervalMs.median).toBeNull();
  expect(report.callbackJitterMs.median).toBeNull();
  expect(report.samplesAtOrAboveCapacity).toBe(0);
});
