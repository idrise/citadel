import type { PlayerCount } from "../simulation/arena";
import { standings } from "../simulation/standings";
import type { MatchState } from "../simulation/types";
import { clamp } from "../simulation/vector";

export const PROGRESS_KEY = "citadel.progress.v1";
export const RESULT_WINDOW = 16;
export const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const SKILL_SCALE = 8;
const TARGET_WIN_RATE = 0.6;
export interface LevelResult {
  level: number;
  count: PlayerCount;
  place: number;
  at: number;
}
export interface PlayerProgress {
  level: number;
  count: PlayerCount;
  best: number;
  rounds: number;
  recent: LevelResult[];
}
export const freshProgress = (): PlayerProgress => ({
  level: 1,
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

/** Recent, time-weighted evidence allows both improvement and returning-player uncertainty. */
export function estimateSkill(recent: readonly LevelResult[], now: number) {
  const scores = Array.from({ length: 191 }, (_, i) => {
    const skill = i - 30;
    const log = recent.reduce((sum, result, index) => {
      const weight =
        Math.pow(0.96, recent.length - 1 - index) *
        Math.pow(0.5, Math.max(0, now - result.at) / WEEK_MS);
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

/** A single saved progression transfers between arena sizes with a rival-count adjustment.
 * Inactivity is derived from the original result, so refreshes never compound the drop. */
export function levelFor(progress: PlayerProgress, count: PlayerCount, now = Date.now()) {
  if (!progress.rounds) return 1;
  const base = clamp(
    progress.level + Math.round(SKILL_SCALE * Math.log((progress.count - 1) / (count - 1))),
    1,
    100,
  );
  const last = progress.recent.at(-1)?.at ?? now;
  const weeks = Math.floor(Math.max(0, now - last) / WEEK_MS);
  const relief = Math.min(20, Math.round(base * Math.min(0.3, weeks * 0.12)));
  return clamp(base - relief, 1, 100);
}

export function recordResult(progress: PlayerProgress, result: LevelResult): PlayerProgress {
  if (!validResult(result)) throw new Error("Invalid progression result");
  const recent = [...progress.recent, { ...result }].slice(-RESULT_WINDOW);
  const { posterior, deviation } = estimateSkill(recent, result.at);
  let desired = 1;
  for (let level = 1; level <= 100; level++) {
    const win = posterior.reduce(
      (sum, s) => sum + s.weight * rankProbability(s.skill, level, result.count, 1),
      0,
    );
    if (win >= TARGET_WIN_RATE) desired = level;
  }
  const step = clamp(Math.round(deviation * 0.75), 2, 24);
  const consistent = recent.slice(-3).filter((r) => r.place === 1).length >= 2;
  const level =
    result.place === 1
      ? result.level === 1
        ? 2
        : consistent
          ? clamp(desired, result.level + 1, result.level + step)
          : result.level + 1
      : clamp(desired, result.level - step, result.level);
  return {
    level: clamp(level, 1, 100),
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
      value.version !== 1 ||
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
    return {
      level: value.level,
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
    storage().setItem(PROGRESS_KEY, JSON.stringify({ version: 1, ...progress }));
    return true;
  } catch {
    return false;
  }
}
