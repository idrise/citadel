/** Bounded time history, independent of spin, frame rate and trail instance budget. */
export function createBallTrail() {
  const capacity = 64,
    times = new Float64Array(capacity),
    xs = new Float64Array(capacity),
    ys = new Float64Array(capacity);
  let start = 0,
    size = 0;
  const index = (i: number) => (start + i) % capacity;
  return {
    reset() {
      start = size = 0;
    },
    push(time: number, x: number, y: number) {
      if (size && time <= times[index(size - 1)]!) {
        if (time === times[index(size - 1)]!) return;
        start = size = 0;
      }
      if (size === capacity) {
        start = index(1);
        size--;
      }
      const slot = index(size++);
      times[slot] = time;
      xs[slot] = x;
      ys[slot] = y;
      while (size > 2 && times[index(1)]! < time - 0.15) {
        start = index(1);
        size--;
      }
    },
    sample(time: number, speed: number, count: number, output: Float32Array) {
      if (size < 2 || count < 2) return 0;
      const window = Math.min(
          0.075 + 0.015 * Math.max(0, Math.min(1, (speed - 14) / 46)),
          4.8 / Math.max(1, speed),
        ),
        duration = Math.min(window, time - times[start]!);
      if (duration <= 0) return 0;
      let cursor = size - 2;
      for (let part = 0; part < count; part++) {
        const t = time - (duration * part) / (count - 1);
        while (cursor > 0 && times[index(cursor)]! > t) cursor--;
        const a = index(cursor),
          b = index(cursor + 1),
          blend = Math.max(0, Math.min(1, (t - times[a]!) / (times[b]! - times[a]!)));
        output[part * 2] = xs[a]! + (xs[b]! - xs[a]!) * blend;
        output[part * 2 + 1] = ys[a]! + (ys[b]! - ys[a]!) * blend;
      }
      return count;
    },
  };
}
