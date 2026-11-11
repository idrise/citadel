/** A busy render/main thread can deliver several overdue transport callbacks together.
 * Drop stale audio rather than clamping multiple mono attacks onto the same native time. */
export function createScheduleWindow() {
  let previous = -Infinity;
  return (time: number, now: number): boolean => {
    if (time < now + 0.002 || time <= previous + 1e-7) return false;
    previous = time;
    return true;
  };
}
