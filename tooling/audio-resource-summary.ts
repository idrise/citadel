export interface AudioResourceSample {
  contextId: string;
  callbackBufferSize: number;
  sampleRate: number;
  renderCapacity: number;
  callbackIntervalMean: number;
  callbackIntervalVariance: number;
  inspectedNodes: number;
  inspectedParams: number;
}

function distribution(values: number[]) {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  const percentile = (q: number) => sorted[Math.floor((sorted.length - 1) * q)] ?? null;
  return {
    samples: sorted.length,
    median: percentile(0.5),
    p95: percentile(0.95),
    max: sorted.at(-1) ?? null,
  };
}
/** Chromium supplies a ratio despite the CDP schema's percent wording. Match DevTools:
 * https://github.com/ChromeDevTools/devtools-frontend/blob/main/front_end/panels/web_audio/WebAudioView.ts
 * These are sparse callback samples, not continuous CPU utilisation or a deadline guarantee. */
export function summariseAudioResources(samples: readonly AudioResourceSample[]) {
  return [...new Set(samples.map((sample) => sample.contextId))].map((contextId) => {
    const rows = samples.filter((sample) => sample.contextId === contextId);
    return {
      contextId,
      samples: rows.length,
      callbackBufferMs: distribution(
        rows
          .filter(
            (row) =>
              Number.isFinite(row.sampleRate) &&
              Number.isFinite(row.callbackBufferSize) &&
              row.sampleRate > 0 &&
              row.callbackBufferSize > 0,
          )
          .map((row) => (row.callbackBufferSize / row.sampleRate) * 1000),
      ),
      renderCapacityPercent: distribution(
        rows.filter((row) => row.renderCapacity >= 0).map((row) => row.renderCapacity * 100),
      ),
      callbackIntervalMs: distribution(
        rows
          .filter((row) => row.callbackIntervalMean >= 0)
          .map((row) => row.callbackIntervalMean * 1000),
      ),
      callbackJitterMs: distribution(
        rows
          .filter((row) => row.callbackIntervalVariance >= 0)
          .map((row) => Math.sqrt(row.callbackIntervalVariance) * 1000),
      ),
      samplesAtOrAboveCapacity: rows.filter(
        (row) => Number.isFinite(row.renderCapacity) && row.renderCapacity >= 1,
      ).length,
      peakInspectedNodes: Math.max(0, ...rows.map((row) => row.inspectedNodes)),
      peakInspectedParams: Math.max(0, ...rows.map((row) => row.inspectedParams)),
    };
  });
}
