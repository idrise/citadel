import { expect, it } from "vite-plus/test";
import { createMatch } from "../simulation/match";
import {
  createProgressRecorder,
  estimateSkill,
  freshProgress,
  levelFor,
  loadProgress,
  parseProgress,
  PROGRESS_KEY,
  rankProbability,
  recordResult,
  RESULT_WINDOW,
  saveProgress,
  WEEK_MS,
} from "./progression";

it("starts easy, requires consistent wins, reaches the ceiling quickly and comes back down", () => {
  let progress = freshProgress();
  expect(levelFor(progress, 6, 0)).toBe(1);
  progress = recordResult(progress, { level: 1, count: 4, place: 1, at: 0 });
  expect(progress.level).toBe(1);
  for (let i = 0; i < 7; i++)
    progress = recordResult(progress, { level: progress.level, count: 4, place: 1, at: i + 1 });
  expect(progress.level).toBe(100);
  for (let i = 0; i < 12; i++)
    progress = recordResult(progress, { level: progress.level, count: 4, place: 4, at: i + 20 });
  expect(progress.level).toBeLessThan(50);
  expect(progress.best).toBe(100);
  expect(progress.recent).toHaveLength(RESULT_WINDOW);
  for (let i = 0; i < 30; i++)
    progress = recordResult(progress, { level: progress.level, count: 4, place: 4, at: i + 100 });
  expect(progress.level).toBe(1);
});

it("softens a return after a week without compounding refreshes or erasing the personal best", () => {
  const progress = {
    ...freshProgress(),
    level: 80,
    best: 90,
    rounds: 1,
    recent: [{ level: 80, count: 4 as const, place: 1, at: 1000 }],
  };
  expect(levelFor(progress, 4, WEEK_MS)).toBe(80);
  const returning = levelFor(progress, 4, WEEK_MS + 1000);
  expect(returning).toBe(70);
  expect(levelFor(progress, 4, WEEK_MS + 1000)).toBe(returning);
  expect(levelFor(progress, 4, 0)).toBe(80);
  expect(levelFor(progress, 4, WEEK_MS * 100)).toBe(60);
  expect(progress.level).toBe(80);
  expect(progress.best).toBe(90);
  expect(levelFor(progress, 6, 1000)).toBeLessThan(80);
  expect(levelFor(progress, 2, 1000)).toBeGreaterThan(80);
  expect(estimateSkill(progress.recent, WEEK_MS * 5).deviation).toBeGreaterThan(
    estimateSkill(progress.recent, 1000).deviation,
  );
});

it("uses finishing position and arena size as evidence rather than treating all losses alike", () => {
  const previous = { ...freshProgress(), level: 70 };
  const second = recordResult(previous, { level: 70, count: 6, place: 2, at: 0 });
  const last = recordResult(previous, { level: 70, count: 6, place: 6, at: 0 });
  expect(second.level).toBeGreaterThan(last.level);
  for (const skill of [-30, 50, 160])
    for (const count of [2, 4, 6]) {
      let sum = 0;
      for (let place = 1; place <= count; place++) sum += rankProbability(skill, 50, count, place);
      expect(sum).toBeCloseTo(1, 10);
    }
});

it("learns around noisy synthetic player abilities within a small sample, without a 100-round grind", () => {
  const errors: number[] = [];
  let randomState = 1234;
  const random = () => {
    randomState = (Math.imul(randomState, 1664525) + 1013904223) >>> 0;
    return (randomState + 0.5) / 4294967296;
  };
  const performance = (skill: number) => skill - 8 * Math.log(-Math.log(random()));
  for (const count of [2, 4, 6] as const)
    for (const skill of [30, 65, 100])
      for (let trial = 0; trial < 15; trial++) {
        let progress = freshProgress();
        for (let round = 0; round < 14; round++) {
          const level = levelFor(progress, count, round);
          const human = performance(skill);
          const place =
            1 +
            Array.from({ length: count - 1 }, () => performance(level)).filter((bot) => bot > human)
              .length;
          progress = recordResult(progress, { level, count, place, at: round });
        }
        const target = Math.max(1, Math.min(100, skill - 8 * Math.log(1.5 * (count - 1))));
        errors.push(Math.abs(progress.level - target));
      }
  errors.sort((a, b) => a - b);
  expect(errors[Math.floor(errors.length / 2)]).toBeLessThan(9);
  expect(errors[Math.floor(errors.length * 0.9)]).toBeLessThan(19);
});

it("records a finished round once and ignores title, abandoned rounds, and draws", () => {
  const record = createProgressRecorder(0, 35),
    state = createMatch(2026, 4);
  expect(record(state, 0)).toBeNull();
  state.phase = "playing";
  expect(record(state, 0)).toBeNull();
  state.phase = "finished";
  expect(record(state, 0)).toBeNull();
  state.winner = 2;
  state.eliminations = [
    { seat: 3, elapsed: 1 },
    { seat: 0, elapsed: 2 },
    { seat: 1, elapsed: 3 },
  ];
  expect(record(state, 400)).toEqual({ level: 35, count: 4, place: 3, at: 400 });
  expect(record({ ...state }, 500)).toBeNull();
});

it("round-trips bounded versioned progress and survives blocked, malformed and hostile storage", () => {
  const progress = recordResult(freshProgress(), { level: 1, count: 2, place: 1, at: 100 });
  let raw = "";
  expect(
    saveProgress(progress, () => ({
      setItem: (key, value) => {
        expect(key).toBe(PROGRESS_KEY);
        raw = value;
      },
    })),
  ).toBe(true);
  expect(loadProgress(() => ({ getItem: () => raw }))).toEqual(progress);
  for (const value of [
    null,
    "broken",
    "{}",
    JSON.stringify({ version: 99, ...progress }),
    JSON.stringify({ version: 1, ...progress, level: 101 }),
    JSON.stringify({ version: 1, ...progress, recent: [{ level: 2, count: 2, place: 6, at: 0 }] }),
    "x".repeat(40000),
  ])
    expect(parseProgress(value)).toEqual(freshProgress());
  const blocked = () => {
    throw new Error("blocked");
  };
  expect(loadProgress(blocked)).toEqual(freshProgress());
  expect(saveProgress(progress, blocked)).toBe(false);
});

it("saves a known personal loss immediately while remaining bots continue, without counting it again at victory", () => {
  const state = createMatch(2026, 6),
    recorder = createProgressRecorder(0, 80);
  state.phase = "playing";
  state.players[0]!.health.fill(false);
  state.eliminations = [
    { seat: 1, elapsed: 5 },
    { seat: 0, elapsed: 10 },
  ];
  expect(recorder(state, 100)).toEqual({ level: 80, count: 6, place: 5, at: 100 });
  state.phase = "finished";
  state.winner = 2;
  expect(recorder(state, 300)).toBeNull();
});
