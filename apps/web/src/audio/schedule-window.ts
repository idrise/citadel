export const MUSIC_LOOK_AHEAD = 0.2;
export const MUSIC_TICK_INTERVAL = 0.015;

/** Keep stale mono attacks out of the graph, while exposing scheduler starvation.
 * Music is queued ahead of the audio clock; live impacts retain their own short grid. */
export function createScheduleWindow() {
  let previous = -Infinity,
    lastCallback: number | null = null;
  let accepted = 0,
    late = 0,
    duplicate = 0,
    invalid = 0;
  let minHeadroomMs: number | null = null,
    lastHeadroomMs: number | null = null,
    maxCallbackGapMs = 0;
  const accept = (time: number, now: number): boolean => {
    if (!Number.isFinite(time) || !Number.isFinite(now)) {
      invalid++;
      return false;
    }
    const headroom = (time - now) * 1000;
    lastHeadroomMs = headroom;
    minHeadroomMs = minHeadroomMs === null ? headroom : Math.min(minHeadroomMs, headroom);
    if (lastCallback !== null)
      maxCallbackGapMs = Math.max(maxCallbackGapMs, (now - lastCallback) * 1000);
    lastCallback = now;
    if (time < now + 0.002) {
      late++;
      return false;
    }
    if (time <= previous + 1e-7) {
      duplicate++;
      return false;
    }
    previous = time;
    accepted++;
    return true;
  };
  return Object.assign(accept, {
    resume() {
      lastCallback = null;
    },
    snapshot() {
      return {
        accepted,
        late,
        duplicate,
        invalid,
        minHeadroomMs,
        lastHeadroomMs,
        maxCallbackGapMs,
      };
    },
  });
}
export type ScheduleDiagnostics = ReturnType<ReturnType<typeof createScheduleWindow>["snapshot"]>;
