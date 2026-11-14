import { expect, it } from "vite-plus/test";
import { createMatch } from "../simulation/match";
import {
  createProgressRecorder,
  estimateSkill,
  freshProgress,
  levelFor,
  levelAfterLoss,
  loadProgress,
  parseProgress,
  PROGRESS_KEY,
  rankProbability,
  recordResult,
  RESULT_WINDOW,
  saveProgress,
} from "./progression";

it("advances on every win, accelerates consistent wins, reaches the ceiling quickly and demotes once per three losses", () => {
  let progress = freshProgress();
  expect(levelFor(progress, 6)).toBe(1);
  progress = recordResult(progress, { level: 1, count: 4, place: 1, at: 0 });
  expect(progress.level).toBe(2);
  for (let i = 0; i < 21; i++)
    progress = recordResult(progress, { level: progress.level, count: 4, place: 1, at: i + 1 });
  expect(progress.level).toBe(100);
  for (let i = 0; i < 12; i++)
    progress = recordResult(progress, { level: progress.level, count: 4, place: 4, at: i + 20 });
  expect(progress.level).toBe(96);
  expect(progress.best).toBe(100);
  expect(progress.recent).toHaveLength(RESULT_WINDOW);
  for (let i = 0; i < 30; i++)
    progress = recordResult(progress, { level: progress.level, count: 4, place: 4, at: i + 100 });
  expect(progress.level).toBe(86);
});

it("ignores time away entirely, while preserving arena-size adjustment and result-order weighting", () => {
  const progress = {
    ...freshProgress(),
    level: 80,
    best: 90,
    rounds: 1,
    recent: [{ level: 80, count: 4 as const, place: 1, at: 0 }],
  };
  const recent = { ...progress, recent: [{ ...progress.recent[0]!, at: Date.now() }] };
  expect(levelFor(progress, 4)).toBe(80);
  expect(levelFor(recent, 4)).toBe(80);
  expect(estimateSkill(progress.recent)).toEqual(estimateSkill(recent.recent));
  expect(levelFor(progress, 6)).toBeLessThan(80);
  expect(levelFor(progress, 2)).toBeGreaterThan(80);
});

it("uses finishing position and arena size as evidence rather than treating all losses alike", () => {
  const previous = { ...freshProgress(), level: 70 };
  const second = recordResult(previous, { level: 70, count: 6, place: 2, at: 0 });
  const last = recordResult(previous, { level: 70, count: 6, place: 6, at: 0 });
  expect(second.level).toBe(70);
  expect(last.level).toBe(70);
  expect(estimateSkill(second.recent).posterior).not.toEqual(estimateSkill(last.recent).posterior);
  for (const skill of [-30, 50, 160])
    for (const count of [2, 4, 6]) {
      let sum = 0;
      for (let place = 1; place <= count; place++) sum += rankProbability(skill, 50, count, place);
      expect(sum).toBeCloseTo(1, 10);
    }
});

it("uses losses to temper future upward calibration without demoting a retry", () => {
  const history = (place: number) => ({
    ...freshProgress(),
    level: 70,
    rounds: 3,
    recent: Array.from({ length: 3 }, (_, at) => ({ level: 70, count: 4 as const, place, at })),
  });
  const win = { level: 70, count: 4 as const, place: 1, at: 3 };
  expect(recordResult(history(4), win).level).toBe(71);
  expect(recordResult(history(1), win).level).toBeGreaterThan(71);
});

it("retries the actual played level for every losing place and roster, including adjusted attempts", () => {
  for (const count of [2, 3, 4, 5, 6] as const)
    for (const level of [1, 2, 35, 80, 100])
      for (let place = 2; place <= count; place++) {
        // Saved rating can differ from the attempted level after inactivity or roster changes.
        const progress = recordResult(
          { ...freshProgress(), level: 99 },
          { level, count, place, at: 1000 },
        );
        expect(progress.level).toBe(level);
        expect(levelFor(progress, count)).toBe(level);
        expect(parseProgress(JSON.stringify({ version: 2, ...progress }))).toEqual(progress);
        expect(progress.recent.at(-1)).toEqual({ level, count, place, at: 1000 });
      }
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

it("always advances a win, even after losses or at a roster-adjusted level, and caps at 100", () => {
  for (const level of [1, 25, 70, 99, 100]) {
    const previous = {
      ...freshProgress(),
      level,
      rounds: 1,
      recent: [{ level, count: 4 as const, place: 4, at: 0 }],
    };
    expect(recordResult(previous, { level, count: 4, place: 1, at: 1 }).level).toBe(
      Math.min(100, level + 1),
    );
  }
});

it("winning level one always leads to two, including progress saved by an older build", () => {
  const previous = recordResult(freshProgress(), { level: 1, count: 2, place: 1, at: 0 });
  const legacy = { ...previous, level: 1 };
  expect(recordResult(legacy, { level: 1, count: 2, place: 1, at: 1 }).level).toBe(2);
});

it("repairs an older loss-demoted save without restoring intentional version-two demotions", () => {
  const old = {
    ...freshProgress(),
    level: 1,
    count: 4 as const,
    rounds: 1,
    recent: [{ level: 80, count: 4 as const, place: 4, at: 1000 }],
  };
  const repaired = parseProgress(JSON.stringify({ version: 1, ...old }));
  expect(repaired.level).toBe(80);
  expect(levelFor(repaired, 4)).toBe(80);
  expect(repaired.recent).toEqual(old.recent);
  const won = recordResult(freshProgress(), { level: 1, count: 4, place: 1, at: 1000 });
  expect(parseProgress(JSON.stringify({ version: 2, ...won })).level).toBe(2);
});

it.each([1, 2, 35, 100])(
  "demotes level %i exactly once per three consecutive losses and persists it",
  (initial) => {
    let progress = { ...freshProgress(), level: initial };
    for (let round = 1; round <= 6; round++) {
      const from = progress.level;
      progress = recordResult(progress, { level: from, count: 4, place: 4, at: round });
      expect(progress.level).toBe(Math.max(1, initial - Math.floor(round / 3)));
      expect(progress.losses).toBe(round % 3);
      expect(progress.demotion).toEqual(
        round % 3 === 0 && from > 1 ? { from, to: from - 1, count: 4 } : null,
      );
      expect(parseProgress(JSON.stringify({ version: 2, ...progress }))).toEqual(progress);
    }
  },
);
it("a win or different challenge clears the pending loss streak; legacy losses migrate once", () => {
  let progress = recordResult(freshProgress(), { level: 35, count: 4, place: 4, at: 0 });
  progress = recordResult(progress, { level: 35, count: 4, place: 4, at: 1 });
  expect(progress.losses).toBe(2);
  const won = recordResult(progress, { level: 35, count: 4, place: 1, at: 2 });
  expect(won.losses).toBe(0);
  expect(won.demotion).toBeNull();
  expect(recordResult(progress, { level: 35, count: 6, place: 6, at: 2 }).losses).toBe(1);
  expect(recordResult(progress, { level: 20, count: 4, place: 4, at: 2 }).losses).toBe(1);
  const legacy = parseProgress(JSON.stringify({ version: 1, ...progress }));
  expect(legacy.losses).toBe(2);
  const demoted = recordResult(legacy, { level: 35, count: 4, place: 4, at: 2 });
  expect(demoted.level).toBe(34);
  expect(parseProgress(JSON.stringify({ version: 2, ...demoted })).level).toBe(34);
});
it("rejects malformed version-two counters and demotions", () => {
  for (const extra of [
    { losses: 3 },
    { losses: -1 },
    { demotion: { from: 10, to: 8, count: 4 } },
    { demotion: { from: 2, to: 1, count: 6 } },
  ])
    expect(parseProgress(JSON.stringify({ version: 2, ...freshProgress(), ...extra }))).toEqual(
      freshProgress(),
    );
});

it("requires three new losses after a win even after reloading with a stale saved counter", () => {
  for (const count of [2, 6, 16] as const)
    for (const level of [1, 35, 99, 100]) {
      let progress: ReturnType<typeof freshProgress> = { ...freshProgress(), count, level };
      for (let at = 0; at < 2; at++)
        progress = recordResult(progress, { count, level, place: count, at });
      progress = recordResult(progress, { count, level, place: 1, at: 2 });
      expect(progress.losses).toBe(0);
      // Older/stale counters must not survive a recorded win on load.
      progress = parseProgress(JSON.stringify({ version: 2, ...progress, losses: 2 }));
      expect(progress.losses).toBe(0);
      const nextLevel = progress.level;
      for (let loss = 1; loss <= 3; loss++) {
        expect(levelAfterLoss(progress, count)).toBe(loss === 3 ? nextLevel - 1 : nextLevel);
        progress = recordResult(progress, { count, level: nextLevel, place: count, at: 2 + loss });
        expect(progress.level).toBe(loss === 3 ? nextLevel - 1 : nextLevel);
        expect(progress.losses).toBe(loss % 3);
        expect(progress.demotion).toEqual(
          loss === 3 ? { from: nextLevel, to: nextLevel - 1, count } : null,
        );
        progress = parseProgress(JSON.stringify({ version: 2, ...progress }));
      }
    }
});

it.each([25, 60, 100])("finds a synthetic threshold of %i without large overshoots", (capacity) => {
  let progress = freshProgress();
  for (let round = 0; round < 30; round++) {
    const from = progress.level;
    progress = recordResult(progress, {
      level: from,
      count: 4,
      place: from <= capacity ? 1 : 4,
      at: round,
    });
    expect(progress.level - from).toBeLessThanOrEqual(5);
    expect(from - progress.level).toBeLessThanOrEqual(1);
  }
  expect(progress.level).toBeGreaterThanOrEqual(capacity);
  expect(progress.level).toBeLessThanOrEqual(Math.min(100, capacity + 1));
});
