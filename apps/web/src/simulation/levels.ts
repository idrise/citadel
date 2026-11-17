import type { ArenaShape } from "./arena-variant";
import type { BatProfile } from "./bat-profile";
import { ARENA } from "./arena-tuning";
import { isPlayerCount, type PlayerCount } from "./player-count";

export interface LevelBots {
  readonly reaction: number;
  readonly jitter: number;
  readonly error: number;
  readonly horizon: number;
  readonly serveScale: number;
  readonly speed: number;
  readonly tactics: number;
}
export interface LevelFeatures {
  readonly playerCount: Exclude<PlayerCount, 3>;
  readonly arenaShape: ArenaShape;
  readonly batProfile: BatProfile;
  readonly maxBalls: number;
  readonly ballInterval: number;
  readonly ballSpeed: number;
  readonly pickupCount: number;
  readonly batScale: number;
  readonly bots: LevelBots;
}
export interface LevelDefinition extends LevelFeatures {
  readonly level: number;
}
export type LevelOverride = Partial<Omit<LevelFeatures, "bots">> & { bots?: Partial<LevelBots> };

// Relative frequencies, not percentages. Six is favoured in both parts of the ladder.
// Adjust the seed to reshuffle the itinerary; retries/reloads always use the same roster.
export const ROSTER_SEED = 20261117;
export const PLAYER_WEIGHTS = [
  { count: 2, weight: 1 },
  { count: 4, weight: 1 },
  { count: 5, weight: 1 },
  { count: 6, weight: 3 },
  { count: 7, weight: 1 },
  { count: 8, weight: 1 },
  { count: 9, weight: 1 },
  { count: 10, weight: 1 },
  { count: 11, weight: 1 },
  { count: 12, weight: 1 },
  { count: 13, weight: 1 },
  { count: 14, weight: 1 },
  { count: 15, weight: 1 },
  { count: 16, weight: 1 },
] as const;

function playerCount(level: number): LevelFeatures["playerCount"] {
  const choices = PLAYER_WEIGHTS.filter((entry) => level > 20 || entry.count <= 7);
  // Integer hash: stable across browsers, independent of gameplay/supply RNG.
  let hash = (level ^ ROSTER_SEED) >>> 0;
  hash = Math.imul(hash ^ (hash >>> 16), 0x21f0aaad);
  hash = Math.imul(hash ^ (hash >>> 15), 0x735a2d97);
  const roll = ((hash ^ (hash >>> 15)) >>> 0) / 0x100000000;
  let ticket = roll * choices.reduce((sum, entry) => sum + entry.weight, 0);
  for (const entry of choices) {
    ticket -= entry.weight;
    if (ticket < 0) return entry.count;
  }
  return 6;
}

// Seconds for reaction/jitter/horizon; error in radians; speed in radians/second.
// Levels 1–60 retain their original curve. Elite bots improve gradually but stay fallible.
export const BOT_ANCHORS = [
  { level: 1, reaction: 0.65, jitter: 0.3, error: 2.8, horizon: 0.1, serveScale: 1.7, speed: 2 },
  {
    level: 35,
    reaction: 0.38,
    jitter: 0.28,
    error: 2,
    horizon: 0.14,
    serveScale: 1.35,
    speed: ARENA.paddleSpeed,
  },
  {
    level: 60,
    reaction: 0.22,
    jitter: 0.18,
    error: 1.5,
    horizon: 0.22,
    serveScale: 1,
    speed: ARENA.paddleSpeed,
  },
  {
    level: 80,
    reaction: 0.16,
    jitter: 0.1,
    error: 0.65,
    horizon: 0.34,
    serveScale: 0.95,
    speed: ARENA.paddleSpeed,
  },
  {
    level: 100,
    // 110–190ms reactions and ±0.225-rad catch error leave real scoring chances.
    reaction: 0.11,
    jitter: 0.08,
    error: 0.45,
    horizon: 0.5,
    serveScale: 0.85,
    speed: 4.8,
  },
] as const;
function botCurve(level: number, key: Exclude<keyof LevelBots, "tactics">) {
  const index = BOT_ANCHORS.findIndex((anchor) => anchor.level >= level);
  const high = BOT_ANCHORS[Math.max(1, index)]!,
    low = BOT_ANCHORS[Math.max(0, index - 1)]!;
  const t = (level - low.level) / (high.level - low.level);
  return t === 1 ? high[key] : low[key] + (high[key] - low[key]) * t;
}

type Formulas<T> = { [K in keyof T]: (level: number) => T[K] };
type LevelFormulas = Omit<Formulas<LevelFeatures>, "ballInterval"> & {
  ballInterval: (level: number, maxBalls: number) => number;
};
export const BOT_FORMULAS: Formulas<LevelBots> = {
  reaction: (level) => botCurve(level, "reaction"),
  jitter: (level) => botCurve(level, "jitter"),
  error: (level) => botCurve(level, "error"),
  horizon: (level) => botCurve(level, "horizon"),
  serveScale: (level) => botCurve(level, "serveScale"),
  speed: (level) => botCurve(level, "speed"),
  tactics: (level) => (level - 1) / 99,
};

/** Edit a formula to change the whole ladder; override individual levels below. */
export const LEVEL_FORMULAS: LevelFormulas = {
  playerCount,
  arenaShape: (level) => {
    if (level >= 99) return "classic";
    const families: ArenaShape[] = ["classic", "wide", "faceted", "compact", "spacious", "rounded"];
    const pattern = [0, 1, 5, 3, 1, 4, 2, 5, 3, 1];
    return families[(pattern[(level - 1) % 10]! + Math.floor((level - 1) / 10)) % families.length]!;
  },
  batProfile: (level) => {
    const sequence: BatProfile[] = ["standard", "shallow", "deep", "standard", "deep", "shallow"];
    return sequence[Math.floor((level - 1) / 5) % sequence.length]!;
  },
  maxBalls: (level) => 1 + Math.floor(((level - 1) * 15) / 99),
  // Derived from the resolved ball cap, including any per-level override.
  ballInterval: (_level, maxBalls) => Math.min(12, 30 / Math.max(1, maxBalls - 1)),
  ballSpeed: (level) => 14 + 20 * ((level - 1) / 99),
  pickupCount: (level) => (level < 5 ? 0 : 1 + Math.floor((level - 5) / 15)),
  batScale: (level) =>
    level <= 50 ? 1.35 - (0.35 * (level - 1)) / 49 : 1 - (0.3 * (level - 50)) / 50,
  bots: (level) => ({
    reaction: BOT_FORMULAS.reaction(level),
    jitter: BOT_FORMULAS.jitter(level),
    error: BOT_FORMULAS.error(level),
    horizon: BOT_FORMULAS.horizon(level),
    serveScale: BOT_FORMULAS.serveScale(level),
    speed: BOT_FORMULAS.speed(level),
    tactics: BOT_FORMULAS.tactics(level),
  }),
};

/** Omitted keys use their formula. Bot overrides merge one field at a time too.
 * Example: 12: { playerCount: 6, ballSpeed: 18, bots: { reaction: 0.4 } } */
export const LEVEL_OVERRIDES: Readonly<Partial<Record<number, LevelOverride>>> = {
  1: { playerCount: 6 },
};

/** Exported resolver also supports isolated tuning previews/tests without mutating live rules. */
export function resolveLevel(requested: number, override?: LevelOverride): LevelDefinition {
  const level = Math.max(1, Math.min(100, Math.floor(Number.isFinite(requested) ? requested : 1)));
  const patch = override ?? LEVEL_OVERRIDES[level];
  const maxBalls = patch?.maxBalls ?? LEVEL_FORMULAS.maxBalls(level);
  const rules = {
    level,
    playerCount: patch?.playerCount ?? LEVEL_FORMULAS.playerCount(level),
    arenaShape: patch?.arenaShape ?? LEVEL_FORMULAS.arenaShape(level),
    batProfile: patch?.batProfile ?? LEVEL_FORMULAS.batProfile(level),
    maxBalls,
    ballInterval: patch?.ballInterval ?? LEVEL_FORMULAS.ballInterval(level, maxBalls),
    ballSpeed: patch?.ballSpeed ?? LEVEL_FORMULAS.ballSpeed(level),
    pickupCount: patch?.pickupCount ?? LEVEL_FORMULAS.pickupCount(level),
    batScale: patch?.batScale ?? LEVEL_FORMULAS.batScale(level),
    bots: Object.freeze({ ...LEVEL_FORMULAS.bots(level), ...patch?.bots }),
  };
  if (
    !isPlayerCount(rules.playerCount) ||
    Number(rules.playerCount) === 3 ||
    (level <= 20 && rules.playerCount > 7)
  )
    throw new Error(`Level ${level}: playerCount must be 2 or 4–${level <= 20 ? 7 : 16}`);
  return Object.freeze(rules);
}

const LEVELS = Array.from({ length: 100 }, (_, index) => resolveLevel(index + 1));
export function levelFeatures(requested: number): LevelDefinition {
  const level = Math.max(1, Math.min(100, Math.floor(Number.isFinite(requested) ? requested : 1)));
  return LEVELS[level - 1]!;
}
