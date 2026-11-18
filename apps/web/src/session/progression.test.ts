import { expect, it } from "vite-plus/test";
import { createMatch } from "../simulation/match";
import {
  createProgressRecorder,
  freshProgress,
  levelFor,
  levelAfterLoss,
  loadProgress,
  MAX_REPLAY_TOKENS,
  parseProgress,
  PROGRESS_KEY,
  recordResult,
  RESULT_WINDOW,
  saveProgress,
} from "./progression";

it("records only actual wins, across restored challenges and a win at the ceiling", () => {
  expect(freshProgress().best).toBe(0);
  let progress = recordResult(freshProgress(), { level: 1, count: 6, place: 6, at: 0 });
  expect(progress.best).toBe(0);
  progress = recordResult(progress, { level: 1, count: 6, place: 1, at: 1 });
  expect(progress).toMatchObject({ level: 2, best: 1 });
  progress = recordResult(progress, { level: 5, count: 6, place: 1, at: 2 });
  expect(progress.level).toBe(6);
  const strong = {
    ...freshProgress(),
    level: 70,
    rounds: 2,
    recent: [0, 1].map((at) => ({ level: 70, count: 6 as const, place: 1, at })),
  };
  const won = recordResult(strong, { level: 70, count: 6, place: 1, at: 2 });
  expect(won.level).toBe(71);
  expect(won.best).toBe(70);
  expect(progress.best).toBe(5);
  const unlocked = progress.level;
  for (let at = 3; at <= 6; at++)
    progress = recordResult(progress, { level: unlocked, count: 6, place: 6, at });
  expect(progress.level).toBe(unlocked - 1);
  expect(progress.best).toBe(5);
  progress = recordResult(progress, { level: 100, count: 6, place: 1, at: 7 });
  expect(progress).toMatchObject({ level: 100, best: 100 });
});

it("migrates reached-level records from retained wins without inventing victories", () => {
  const old = {
    ...freshProgress(),
    level: 25,
    best: 40,
    rounds: 2,
    recent: [
      { level: 20, count: 4, place: 1, at: 0 },
      { level: 25, count: 4, place: 4, at: 1 },
    ],
  };
  const migrated = parseProgress(JSON.stringify({ version: 3, losses: 0, ...old }));
  expect(migrated).toMatchObject({ level: 25, best: 20, rounds: 2, recent: old.recent });
  const lossOnly = { ...old, recent: old.recent.map((r) => ({ ...r, place: 4 })) };
  expect(parseProgress(JSON.stringify({ version: 3, losses: 0, ...lossOnly })).best).toBe(0);
  for (const version of [1, 2, 4])
    expect(parseProgress(JSON.stringify({ version, losses: 0, ...old })).best).toBe(40);
  expect(parseProgress(JSON.stringify({ version: 4, losses: 0, ...freshProgress() }))).toEqual(
    freshProgress(),
  );
});

it("retains won peaks after their history rolls off and saves tokens as version five", () => {
  let progress = recordResult(freshProgress(), { level: 30, count: 4, place: 1, at: 0 });
  for (let at = 1; at <= RESULT_WINDOW + 3; at++)
    progress = recordResult(progress, { level: progress.level, count: 4, place: 4, at });
  expect(progress.best).toBe(30);
  expect(progress.recent.every((r) => r.place > 1)).toBe(true);
  let raw = "";
  saveProgress(progress, () => ({
    setItem: (_key, value) => {
      raw = value;
    },
  }));
  expect(JSON.parse(raw).version).toBe(5);
  expect(parseProgress(raw)).toEqual(progress);
});

it("visits every level in order through a long win streak and demotes once per four failed attempts", () => {
  let progress = freshProgress();
  expect(levelFor(progress, 6)).toBe(1);
  progress = recordResult(progress, { level: 1, count: 4, place: 1, at: 0 });
  expect(progress.level).toBe(2);
  for (let from = 2; from <= 100; from++) {
    progress = recordResult(progress, { level: from, count: 4, place: 1, at: from });
    expect(progress.level).toBe(Math.min(100, from + 1));
    expect(progress.best).toBe(from);
    progress = parseProgress(JSON.stringify({ version: 5, ...progress }));
    expect(progress.level).toBe(Math.min(100, from + 1));
  }
  for (let i = 0; i < 16; i++)
    progress = recordResult(progress, { level: progress.level, count: 4, place: 4, at: i + 20 });
  expect(progress.level).toBe(96);
  expect(progress.best).toBe(100);
  expect(progress.recent).toHaveLength(RESULT_WINDOW);
  for (let i = 0; i < 40; i++)
    progress = recordResult(progress, { level: progress.level, count: 4, place: 4, at: i + 100 });
  expect(progress.level).toBe(86);
});

it("ignores time away and historical roster changes while preserving saved history", () => {
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
  expect(levelFor(progress, 6)).toBe(80);
  expect(levelFor(progress, 2)).toBe(80);
});

it("retains the actual finishing position and roster in history while losses retry the same level", () => {
  const previous = { ...freshProgress(), level: 70 };
  for (const count of [2, 6, 16] as const)
    for (let place = 2; place <= count; place++) {
      const result = { level: 70, count, place, at: 0 };
      const next = recordResult(previous, result);
      expect(next.level).toBe(70);
      expect(next.recent.at(-1)).toEqual(result);
    }
});

it("advances exactly one level after either a win streak or losses", () => {
  const history = (place: number) => ({
    ...freshProgress(),
    level: 70,
    rounds: 3,
    recent: Array.from({ length: 3 }, (_, at) => ({ level: 70, count: 4 as const, place, at })),
  });
  const win = { level: 70, count: 4 as const, place: 1, at: 3 };
  expect(recordResult(history(4), win).level).toBe(71);
  expect(recordResult(history(1), win).level).toBe(71);
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
        expect(parseProgress(JSON.stringify({ version: 5, ...progress }))).toEqual(progress);
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

it("wins unlock only the next played level across every level, roster, history and token balance", () => {
  for (let level = 1; level <= 100; level++)
    for (const count of [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16] as const)
      for (const replayTokens of [0, 1, 2, 3]) {
        const previous = {
          ...freshProgress(),
          level: 100, // The played level is authoritative, even after switching challenges.
          best: 90,
          replayTokens,
          rounds: RESULT_WINDOW,
          recent: Array.from({ length: RESULT_WINDOW }, (_, at) => ({
            level,
            count: 6 as const,
            place: replayTokens === 0 ? 6 : 1,
            at,
          })),
        };
        const saved = structuredClone(previous);
        const result = { level, count, place: 1, at: RESULT_WINDOW };
        const next = recordResult(previous, result);
        expect(next).toMatchObject({
          level: Math.min(100, level + 1),
          best: Math.max(90, level),
          count,
          replayTokens: MAX_REPLAY_TOKENS,
          demotion: null,
          rounds: RESULT_WINDOW + 1,
        });
        expect(next.recent).toEqual([...previous.recent.slice(1), result]);
        expect(previous).toEqual(saved);
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
  expect(parseProgress(JSON.stringify({ version: 5, ...won })).level).toBe(2);
});

it.each([1, 2, 35, 100])(
  "spends all three tokens before demoting level %i on a further failure, across reloads",
  (initial) => {
    let progress = { ...freshProgress(), level: initial };
    for (let round = 1; round <= 8; round++) {
      const from = progress.level;
      expect(levelAfterLoss(progress, 4)).toBe(round % 4 === 0 ? Math.max(1, from - 1) : from);
      const before = structuredClone(progress);
      progress = recordResult(progress, { level: from, count: 4, place: 4, at: round });
      expect(progress.level).toBe(Math.max(1, initial - Math.floor(round / 4)));
      expect(progress.replayTokens).toBe(3 - (round % 4));
      expect(progress.demotion).toEqual(
        round % 4 === 0 && from > 1 ? { from, to: from - 1, count: 4 } : null,
      );
      expect(before.replayTokens).toBe(3 - ((round - 1) % 4));
      expect(parseProgress(JSON.stringify({ version: 5, ...progress }))).toEqual(progress);
    }
  },
);

it("refills on every win, including zero tokens and level 100, and carries tokens across rosters", () => {
  for (const level of [1, 35, 100])
    for (const replayTokens of [0, 1, 2, 3]) {
      const previous = { ...freshProgress(), level, replayTokens };
      const won = recordResult(previous, { level, count: 6, place: 1, at: 0 });
      expect(won.replayTokens).toBe(MAX_REPLAY_TOKENS);
      expect(won.demotion).toBeNull();
      expect(levelAfterLoss(previous, 16)).toBe(
        replayTokens === 0 ? Math.max(1, level - 1) : level,
      );
      const lost = recordResult(previous, { level, count: 16, place: 16, at: 1 });
      expect(lost.replayTokens).toBe(replayTokens === 0 ? 3 : replayTokens - 1);
      expect(lost.level).toBe(replayTokens === 0 ? Math.max(1, level - 1) : level);
    }
});

it("migrates all older counters to remaining tokens once, retaining levels, history and intentional demotions", () => {
  for (const version of [1, 2, 3, 4])
    for (const losses of [0, 1, 2]) {
      const recent = Array.from({ length: losses }, (_, at) => ({
        level: 35,
        count: 6,
        place: 6,
        at,
      }));
      const old = {
        version,
        ...freshProgress(),
        level: 35,
        count: 6,
        losses,
        rounds: losses,
        recent,
      };
      const migrated = parseProgress(JSON.stringify(old));
      expect(migrated).toMatchObject({ level: 35, replayTokens: 3 - losses, recent });
      expect(parseProgress(JSON.stringify({ version: 5, ...migrated }))).toEqual(migrated);
      const demoted = parseProgress(
        JSON.stringify({
          ...old,
          level: 34,
          demotion: { from: 35, to: 34, count: 6 },
        }),
      );
      if (version > 1) expect(demoted).toMatchObject({ level: 34, replayTokens: 3 });
    }
});

it("rejects malformed token balances and demotions without accepting fractional, unbounded or missing data", () => {
  const base = {
    version: 5,
    ...freshProgress(),
    level: 2,
    rounds: 1,
    recent: [{ level: 2, count: 4, place: 4, at: 0 }],
  };
  for (const replayTokens of [-1, 4, 1.5, null, "3", undefined])
    expect(parseProgress(JSON.stringify({ ...base, replayTokens }))).toEqual(freshProgress());
  for (const demotion of [
    { from: 10, to: 8, count: 4 },
    { from: 3, to: 2, count: 6 },
  ])
    expect(parseProgress(JSON.stringify({ ...base, demotion }))).toEqual(freshProgress());
  for (const losses of [-1, 3, null])
    expect(parseProgress(JSON.stringify({ ...base, version: 4, losses }))).toEqual(freshProgress());
});

it("restores three tokens after a recorded win even if an older save has stale losses", () => {
  for (const count of [2, 6, 16] as const)
    for (const level of [1, 35, 99, 100]) {
      let progress: ReturnType<typeof freshProgress> = { ...freshProgress(), count, level };
      for (let at = 0; at < 3; at++)
        progress = recordResult(progress, { count, level, place: count, at });
      progress = recordResult(progress, { count, level, place: 1, at: 3 });
      expect(progress.replayTokens).toBe(3);
      progress = parseProgress(JSON.stringify({ version: 4, ...progress, losses: 2 }));
      expect(progress.replayTokens).toBe(3);
      const nextLevel = progress.level;
      for (let loss = 1; loss <= 4; loss++) {
        expect(levelAfterLoss(progress, count)).toBe(loss === 4 ? nextLevel - 1 : nextLevel);
        progress = recordResult(progress, { count, level: nextLevel, place: count, at: 3 + loss });
        expect(progress.level).toBe(loss === 4 ? nextLevel - 1 : nextLevel);
        expect(progress.replayTokens).toBe(3 - (loss % 4));
        progress = parseProgress(JSON.stringify({ version: 5, ...progress }));
      }
    }
});

it.each([25, 60, 100])(
  "reaches a synthetic threshold of %i by playing every intervening level",
  (capacity) => {
    let progress = freshProgress();
    for (let round = 0; round < capacity + 16; round++) {
      const from = progress.level;
      progress = recordResult(progress, {
        level: from,
        count: 4,
        place: from <= capacity ? 1 : 4,
        at: round,
      });
      expect(progress.level - from).toBeLessThanOrEqual(1);
      expect(from - progress.level).toBeLessThanOrEqual(1);
    }
    expect(progress.level).toBeGreaterThanOrEqual(capacity);
    expect(progress.level).toBeLessThanOrEqual(Math.min(100, capacity + 1));
  },
);
