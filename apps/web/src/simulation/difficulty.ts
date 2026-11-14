import { levelArenaShape, type ArenaShape } from "./arena-variant";
import { clamp } from "./vector";
import { levelBatProfile, type BatProfile } from "./bat-profile";

/** Frozen for a whole attempt; promotion/demotion only changes the following round. */
export interface RoundDifficulty {
  readonly level: number;
  readonly arenaShape: ArenaShape;
  readonly maxBalls: number;
  readonly ballInterval: number;
  readonly ballSpeed: number;
  readonly pickupCount: number;
  readonly batScale: number;
  readonly batProfile: BatProfile;
}

/** Stagger ball/pickup unlocks, with continuous speed and bat-width ramps between them. */
export function levelDifficulty(requested: number): RoundDifficulty {
  const level = clamp(Math.floor(Number.isFinite(requested) ? requested : 1), 1, 100);
  const t = (level - 1) / 99;
  const maxBalls = 1 + Math.floor(((level - 1) * 15) / 99);
  return {
    level,
    arenaShape: levelArenaShape(level),
    batProfile: levelBatProfile(level),
    maxBalls,
    ballInterval: Math.min(12, 30 / Math.max(1, maxBalls - 1)),
    ballSpeed: 14 + 20 * t,
    pickupCount: level < 5 ? 0 : 1 + Math.floor((level - 5) / 15),
    batScale: level <= 50 ? 1.35 - (0.35 * (level - 1)) / 49 : 1 - (0.3 * (level - 50)) / 50,
  };
}
