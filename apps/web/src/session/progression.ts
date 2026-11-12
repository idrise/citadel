import type { PlayerCount } from "../simulation/arena";
import { standings } from "../simulation/standings";
import type { MatchState } from "../simulation/types";
import { clamp } from "../simulation/vector";

export const PROGRESS_KEY = "citadel.progress.v1";
export const RESULT_WINDOW = 16;
const SKILL_SCALE = 8;
const TARGET_WIN_RATE = 0.6;
export interface LevelResult {
  level: number;
  count: PlayerCount;
  place: number;
  at: number;
}
export interface Demotion {
  from: number;
  to: number;
  count: PlayerCount;
}
export interface PlayerProgress {
  losses: number;
  demotion: Demotion | null;
  level: number;
  count: PlayerCount;
  best: number;
  rounds: number;
  recent: LevelResult[];
}
export const freshProgress = (): PlayerProgress => ({
  level: 1,
  losses: 0,
  demotion: null,
  count: 4,
  best: 1,
  rounds: 0,
  recent: [],
});

/** Symmetric-rival ranking likelihood: second of six carries more evidence than last.
 * This is an explicit calibration model, not a claim of measured human win rates. */
export function rankProbability(skill: number, level: number, count: number, place: number) {
  const strength = Math.exp((skill - level) / SKILL_SCALE);
  let probability = 1;
  for (let placed = 0; placed < place - 1; placed++)
    probability *= (count - 1 - placed) / (strength + count - 1 - placed);
  return (probability * strength) / (strength + count - place);
}

/** Recent attempts matter; time away never changes the judgment. */
export function estimateSkill(recent: readonly LevelResult[]) {
  const scores = Array.from({ length: 191 }, (_, i) => {
    const skill = i - 30;
    const log = recent.reduce((sum, result, index) => {
      const weight = Math.pow(0.96, recent.length - 1 - index);
      return (
        sum +
        weight *
          Math.log(
            Math.max(1e-15, rankProbability(skill, result.level, result.count, result.place)),
          )
      );
    }, 0);
    return { skill, log };
  });
  const peak = Math.max(...scores.map((s) => s.log));
  const weights = scores.map((s) => Math.exp(s.log - peak));
  const total = weights.reduce((a, b) => a + b, 0);
  const posterior = scores.map((s, i) => ({ skill: s.skill, weight: weights[i]! / total }));
  const mean = posterior.reduce((sum, s) => sum + s.skill * s.weight, 0);
  const deviation = Math.sqrt(
    posterior.reduce((sum, s) => sum + (s.skill - mean) ** 2 * s.weight, 0),
  );
  return { posterior, deviation };
}

/** Arena-size adjustment only; calendar time does not alter progress. */
export function levelFor(progress: PlayerProgress, count: PlayerCount) {
  if (!progress.rounds) return 1;
  return clamp(
    progress.level + Math.round(SKILL_SCALE * Math.log((progress.count - 1) / (count - 1))),
    1,
    100,
  );
}

export function recordResult(progress: PlayerProgress, result: LevelResult): PlayerProgress {
  if (!validResult(result)) throw new Error("Invalid progression result");
  const recent = [...progress.recent, { ...result }].slice(-RESULT_WINDOW);
  const { posterior, deviation } = estimateSkill(recent);
  let desired = 1;
  for (let level = 1; level <= 100; level++) {
    const win = posterior.reduce(
      (sum, s) => sum + s.weight * rankProbability(s.skill, level, result.count, 1),
      0,
    );
    if (win >= TARGET_WIN_RATE) desired = level;
  }
  // Keep climbs conservative now that each downward step takes three defeats.
  const step = clamp(Math.round(deviation * 0.75), 2, 5);
  const consistent = recent.slice(-3).filter((r) => r.place === 1).length >= 2;
  const sameChallenge = progress.level === result.level && progress.count === result.count;
  const losses = result.place === 1 ? 0 : (sameChallenge ? progress.losses : 0) + 1;
  const demotion: Demotion | null =
    losses >= 3 && result.level > 1
      ? { from: result.level, to: result.level - 1, count: result.count }
      : null;
  const level =
    result.place === 1
      ? result.level === 1
        ? 2
        : consistent
          ? clamp(desired, result.level + 1, result.level + step)
          : result.level + 1
      : (demotion?.to ?? result.level);
  return {
    level: clamp(level, 1, 100),
    losses: losses % 3,
    demotion,
    count: result.count,
    best: result.place === 1 ? Math.max(progress.best, result.level) : progress.best,
    rounds: progress.rounds + 1,
    recent,
  };
}

/** One rating update per resolved player attempt, even while surviving bots finish. */
export function createProgressRecorder(humanSeat: number, level: number) {
  let recorded = false;
  return (state: MatchState, now = Date.now()): LevelResult | null => {
    if (recorded || (state.phase === "finished" && state.winner === null)) return null;
    if (state.phase !== "finished" && !state.eliminations.some((entry) => entry.seat === humanSeat))
      return null;
    const place = standings(state).find((row) => row.seat === humanSeat)?.place;
    if (place === null || place === undefined) return null;
    recorded = true;
    return { level, count: state.players.length as PlayerCount, place, at: now };
  };
}

const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const integer = (value: unknown, low: number, high: number): value is number =>
  typeof value === "number" && Number.isInteger(value) && value >= low && value <= high;
function validResult(value: unknown): value is LevelResult {
  return (
    record(value) &&
    integer(value.level, 1, 100) &&
    integer(value.count, 2, 6) &&
    integer(value.place, 1, value.count) &&
    typeof value.at === "number" &&
    Number.isFinite(value.at) &&
    value.at >= 0 &&
    value.at <= 8.64e15
  );
}
export function parseProgress(raw: string | null): PlayerProgress {
  try {
    if (!raw || raw.length > 32768) return freshProgress();
    const value: unknown = JSON.parse(raw);
    if (
      !record(value) ||
      (value.version !== 1 && value.version !== 2) ||
      !integer(value.level, 1, 100) ||
      !integer(value.count, 2, 6) ||
      !integer(value.best, 1, 100) ||
      !integer(value.rounds, 0, 1e9) ||
      !Array.isArray(value.recent) ||
      value.recent.length > RESULT_WINDOW ||
      !value.recent.every(validResult) ||
      value.recent.length !== Math.min(value.rounds, RESULT_WINDOW)
    )
      return freshProgress();
    const last = value.recent.at(-1) as LevelResult | undefined;
    const legacy = value.version === 1;
    if (
      !legacy &&
      (!integer(value.losses, 0, 2) ||
        (value.demotion !== null &&
          (!record(value.demotion) ||
            !integer(value.demotion.from, 2, 100) ||
            !integer(value.demotion.to, 1, 99) ||
            value.demotion.to !== value.demotion.from - 1 ||
            value.demotion.to !== value.level ||
            value.demotion.count !== value.count)))
    )
      return freshProgress();
    // Repair old immediate demotions once. Version 2 preserves intentional three-loss demotions.
    const retryLevel =
      legacy && last && last.place > 1 && last.count === value.count
        ? Math.max(value.level, last.level)
        : value.level;
    let legacyLosses = 0;
    if (legacy)
      for (const result of [...value.recent].reverse() as LevelResult[]) {
        if (result.place === 1 || result.level !== retryLevel || result.count !== value.count)
          break;
        legacyLosses++;
      }
    return {
      level: retryLevel,
      losses: legacy ? Math.min(2, legacyLosses) : (value.losses as number),
      demotion: legacy ? null : (value.demotion as Demotion | null),
      count: value.count as PlayerCount,
      best: value.best,
      rounds: value.rounds,
      recent: value.recent.map((r: LevelResult) => ({ ...r })),
    };
  } catch {
    return freshProgress();
  }
}
export function loadProgress(storage: () => Pick<Storage, "getItem"> = () => window.localStorage) {
  try {
    return parseProgress(storage().getItem(PROGRESS_KEY));
  } catch {
    return freshProgress();
  }
}
export function saveProgress(
  progress: PlayerProgress,
  storage: () => Pick<Storage, "setItem"> = () => window.localStorage,
) {
  try {
    storage().setItem(PROGRESS_KEY, JSON.stringify({ version: 2, ...progress }));
    return true;
  } catch {
    return false;
  }
}
