import { MUSIC_BPM, type MusicVisuals } from "./music-types";

/** Both light accents and arrangement energy are timestamped on the audio timeline. */
export function createBeatEnvelope() {
  const beats: { time: number; strength: number }[] = [];
  const energies: { time: number; energy: number }[] = [];
  const frame = (now: number): MusicVisuals => {
    let pulse = 0,
      phase = -1,
      energy = 0;
    for (const beat of beats) {
      const age = now - beat.time;
      if (age < 0 || age > 60 / MUSIC_BPM) continue;
      pulse = Math.max(pulse, Math.min(1, age / 0.018) * Math.exp(-age / 0.19) * beat.strength);
      phase = age / (60 / MUSIC_BPM);
    }
    for (const entry of energies) if (entry.time <= now) energy = entry.energy;
    return { pulse: Math.max(0, Math.min(1, pulse)), phase, energy };
  };
  return {
    schedule(time: number, strength: number) {
      beats.push({ time, strength });
      if (beats.length > 8) beats.shift();
    },
    scheduleEnergy(time: number, energy: number) {
      energies.push({ time, energy });
      if (energies.length > 16) energies.shift();
    },
    read: (now: number) => frame(now).pulse,
    frame,
  };
}
