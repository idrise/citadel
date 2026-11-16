import { expect, it } from "vite-plus/test";
import { playbackStats } from "./playback-stats";
it("reports native counters independently of note scheduling and copies the live native object", () => {
  const stats = {
    underrunEvents: 3,
    underrunDuration: 0.02,
    totalDuration: 60,
    averageLatency: 0.015,
    minimumLatency: 0.01,
    maximumLatency: 0.022,
  };
  const context = { playbackStats: stats } as unknown as AudioContext;
  const snapshot = playbackStats(context);
  expect(snapshot).toEqual(stats);
  stats.underrunEvents = 4;
  expect(snapshot?.underrunEvents).toBe(3);
});
it("preserves unavailable, restricted and invalid measurements as unknown", () => {
  expect(playbackStats(null)).toBeNull();
  expect(playbackStats({} as AudioContext)).toBeNull();
  expect(
    playbackStats({
      get playbackStats() {
        throw Error("blocked");
      },
    } as unknown as AudioContext),
  ).toBeNull();
  expect(
    playbackStats({
      playbackStats: { underrunEvents: NaN, totalDuration: 10 },
    } as unknown as AudioContext),
  ).toMatchObject({ underrunEvents: null, totalDuration: 10 });
});
