import { clamp } from "./vector";

/** Frozen for a whole attempt; promotion/demotion only changes the following round. */
export interface RoundDifficulty {
  readonly level: number;
  readonly maxBalls: number;
  readonly ballInterval: number;
  readonly ballSpeed: number;
  readonly pickupCount: number;
  readonly batScale: number;
}

/** Stagger ball/pickup unlocks, with continuous speed and bat-width ramps between them. */
export function levelDifficulty(requested: number): RoundDifficulty {
  const level = clamp(Math.floor(Number.isFinite(requested) ? requested : 1), 1, 100);
  const t = (level - 1) / 99;
  return {
    level,
    maxBalls: 1 + Math.floor((level + 5) / 15), // 10, 25, 40, 55, 70, 85, 100
    ballInterval: 22 - 17 * t,
    ballSpeed: 14 + 20 * t,
    pickupCount: level < 5 ? 0 : 1 + Math.floor((level - 5) / 15),
    batScale: level <= 50 ? 1.35 - (0.35 * (level - 1)) / 49 : 1 - (0.3 * (level - 50)) / 50,
  };
}
