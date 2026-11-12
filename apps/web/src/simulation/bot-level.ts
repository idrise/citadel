import { ARENA, FIXED_DT } from "./arena";
import { clamp } from "./vector";

export const BOT_PROFILES = {
  beginner: {
    reaction: 0.38,
    jitter: 0.28,
    error: 2,
    horizon: 0.14,
    serveScale: 1.35,
    speed: ARENA.paddleSpeed,
  },
  standard: {
    reaction: 0.22,
    jitter: 0.18,
    error: 1.5,
    horizon: 0.22,
    serveScale: 1,
    speed: ARENA.paddleSpeed,
  },
  expert: {
    reaction: 0.1,
    jitter: 0.08,
    error: 0.38,
    horizon: 0.42,
    serveScale: 0.8,
    speed: ARENA.paddleSpeed,
  },
};
const anchors = [
  { level: 1, reaction: 0.65, jitter: 0.3, error: 2.8, horizon: 0.1, serveScale: 1.7, speed: 2 },
  { level: 35, ...BOT_PROFILES.beginner },
  { level: 60, ...BOT_PROFILES.standard },
  { level: 80, ...BOT_PROFILES.expert },
  {
    level: 100,
    reaction: FIXED_DT,
    jitter: 0,
    error: 0,
    horizon: 1,
    serveScale: 0.45,
    speed: ARENA.pointerPaddleSpeed,
  },
];
export function botLevelProfile(level: number) {
  const value = clamp(Number.isFinite(level) ? level : 1, 1, 100);
  const index = anchors.findIndex((a) => a.level >= value);
  const high = anchors[Math.max(1, index)]!,
    low = anchors[Math.max(0, index - 1)]!;
  const t = (value - low.level) / (high.level - low.level);
  const mix = (key: Exclude<keyof typeof low, "level">) =>
    t === 1 ? high[key] : low[key] + (high[key] - low[key]) * t;
  return {
    reaction: mix("reaction"),
    jitter: mix("jitter"),
    error: mix("error"),
    horizon: mix("horizon"),
    serveScale: mix("serveScale"),
    speed: mix("speed"),
    tactics: (value - 1) / 99,
  };
}
