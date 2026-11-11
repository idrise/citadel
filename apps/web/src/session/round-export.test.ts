import { expect, it } from "vite-plus/test";
import { createRoundExport } from "./round-export";
import { createRoundObserver } from "./round-observer";
import { createMatch } from "../simulation/match";
import { createSettings } from "./settings";
it("exports initial seed, honest unfinished status, personal credit and independent configuration snapshots", () => {
  const state = createMatch(2026, 6),
    before = structuredClone(state),
    settings = createSettings();
  const totals = createRoundObserver(6).snapshot();
  totals.players[5]!.scored = 3;
  const report = createRoundExport(
    {
      seed: 2026,
      humanSeat: 5,
      initialSettings: settings,
      settings: { ...settings, music: false },
      build: { version: "0.1.0", revision: "test" },
    },
    state,
    totals,
    "2026-11-11T13:00:00Z",
  );
  expect(report).toMatchObject({
    schema: "citadel.round",
    version: 1,
    seed: 2026,
    initialPlayers: 6,
    humanSeat: 5,
    phase: "countdown",
    winner: null,
    settingsAtStart: { music: true },
    settingsAtExport: { music: false },
  });
  expect(report.players.find((row) => row.seat === 5)!.scored).toBe(3);
  expect(report.players.every((row) => row.place === null)).toBe(true);
  report.settingsAtStart.music = false;
  expect(settings.music).toBe(true);
  expect(state).toEqual(before);
  expect(JSON.parse(JSON.stringify(report))).toEqual(report);
});
