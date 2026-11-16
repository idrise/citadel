/** Optional experimental native-output statistics. Durations/latencies are seconds.
 * Missing/blocked API is unknown, never zero underruns. Do not reset the browser's counters. */
export function playbackStats(context: AudioContext | null) {
  try {
    const stats = (context as (AudioContext & { playbackStats?: Record<string, unknown> }) | null)
      ?.playbackStats;
    if (!stats) return null;
    const read = (key: string) =>
      typeof stats[key] === "number" && Number.isFinite(stats[key]) ? stats[key] : null;
    return {
      underrunEvents: read("underrunEvents"),
      underrunDuration: read("underrunDuration"),
      totalDuration: read("totalDuration"),
      averageLatency: read("averageLatency"),
      minimumLatency: read("minimumLatency"),
      maximumLatency: read("maximumLatency"),
    };
  } catch {
    return null;
  }
}
