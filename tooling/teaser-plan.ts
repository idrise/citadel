import { MUSIC_BPM } from "../apps/web/src/audio/music-types";
import { resolveLevel } from "../apps/web/src/simulation/levels";

export const TEASER_FPS = 60;
// Tone caches PeriodicWave instances across renders; mixing rates detunes reused waves.
export const TEASER_SAMPLE_RATE = 48000;
export const TEASER_SIZE = { width: 1920, height: 1080 };
export const CAPTURE_SIZE = { width: 2560, height: 1440 };
export const CAPTURE_VIEWPORT = { width: 1280, height: 720 };
export const CAPTURE_PIXEL_RATIO = 2;
const levels = Array.from({ length: 100 }, (_, index) => resolveLevel(index + 1));
export const DUEL_LEVEL = levels
  .filter((level) => level.playerCount === 2 && level.level >= 10 && level.level <= 50)
  .at(-1)!.level;
export const CROWD_LEVEL = levels.filter((level) => level.playerCount === 16).at(-1)!.level;

export type TeaserShot =
  | "title"
  | "duel"
  | "curve-left"
  | "level100-intro"
  | "crowd"
  | "chaos"
  | "end";

/** Real seeded play; only the requested transition shot overrides starting capsule count. */
export const TEASER_TAKES: Record<
  TeaserShot,
  {
    level: number;
    seed: number;
    warmup: number;
    viewer: number;
    speed: 0.5 | 0.75 | 1;
    initialPieces?: number;
    followBall?: number;
    curveHit?: { ball: number; attacker: number; target: number };
  }
> = {
  title: { level: 3, seed: 2026, warmup: 0, viewer: 0, speed: 1 },
  duel: { level: DUEL_LEVEL, seed: 2026, warmup: 8, viewer: 0, speed: 1 },
  "curve-left": {
    level: CROWD_LEVEL,
    seed: 1,
    warmup: 0.9,
    viewer: 6,
    speed: 0.75,
    followBall: 0,
    curveHit: { ball: 0, attacker: 14, target: 6 },
  },
  "level100-intro": { level: 100, seed: 2026, warmup: 6.6, viewer: 0, speed: 1, initialPieces: 1 },
  crowd: { level: CROWD_LEVEL, seed: 2026, warmup: 10.5, viewer: 0, speed: 1 },
  chaos: { level: 100, seed: 4, warmup: 26, viewer: 0, speed: 1 },
  end: { level: 3, seed: 2026, warmup: 4, viewer: 0, speed: 1 },
};
const segments: readonly [TeaserShot, number][] = [
  ["title", 16],
  ["duel", 16],
  ["curve-left", 8],
  ["level100-intro", 8],
  ["crowd", 16],
  ["chaos", 16],
  ["end", 8],
];
let beats = 0;
export const TEASER_SHOTS = segments.map(([id, length]) => {
  const start = Math.round((beats * 60 * TEASER_FPS) / MUSIC_BPM);
  beats += length;
  const end = Math.round((beats * 60 * TEASER_FPS) / MUSIC_BPM);
  return { id, start, end, frames: end - start, seconds: (end - start) / TEASER_FPS };
});
export const TEASER_FRAMES = TEASER_SHOTS.at(-1)!.end;
export const TEASER_SECONDS = TEASER_FRAMES / TEASER_FPS;

/** Keep the crop inside the source image, including at the closest tracking position. */
export function teaserCrop(zoom: number, x = 0.5, y = 0.5) {
  const safeZoom = Math.max(1, zoom);
  const width = CAPTURE_SIZE.width / safeZoom;
  const height = CAPTURE_SIZE.height / safeZoom;
  return {
    x: Math.max(0, Math.min(CAPTURE_SIZE.width - width, x * CAPTURE_SIZE.width - width / 2)),
    y: Math.max(0, Math.min(CAPTURE_SIZE.height - height, y * CAPTURE_SIZE.height - height / 2)),
    width,
    height,
  };
}
