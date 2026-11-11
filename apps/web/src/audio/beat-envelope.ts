/** Scheduled audio times, not animation frames. Future kicks must never flash early. */
export function createBeatEnvelope() {
  const beats: { time: number; strength: number }[] = [];
  return {
    schedule(time: number, strength: number) {
      beats.push({ time, strength });
      if (beats.length > 8) beats.shift();
    },
    read(now: number) {
      let pulse = 0;
      for (const beat of beats) {
        const age = now - beat.time;
        if (age < 0 || age > 0.6) continue;
        pulse = Math.max(pulse, Math.min(1, age / 0.012) * Math.exp(-age / 0.14) * beat.strength);
      }
      return Math.max(0, Math.min(1, pulse));
    },
  };
}
