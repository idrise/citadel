import { ARENA } from "./arena-tuning";
import { levelFeatures } from "./levels";

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
/** Shared level formulas and overrides also own bot tuning. */
export const botLevelProfile = (level: number) => levelFeatures(level).bots;
