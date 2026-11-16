import { expect, it } from "vite-plus/test";
import { createPerformanceReport } from "./performance-report";
import { createFrameDiagnostics } from "./frame-diagnostics";
import { createSettings } from "./settings";
it("exports a versioned local report with served build, honest unknowns, and copied settings", () => {
  const build = { version: "1", revision: "abc", buildId: "content", dirty: true };
  const settings = createSettings();
  const report = createPerformanceReport({
    build,
    context: {
      seed: 42,
      supplySeed: 7,
      tick: 120,
      simulationSeconds: 1,
      level: 1,
      initialSeats: 3,
      liveSeats: 3,
      arenaShape: "rounded",
      phase: "playing",
      paused: true,
      settings,
    },
    frames: createFrameDiagnostics().snapshot(),
    audio: { contextState: "unavailable", schedule: null },
    graphics: { renderer: null },
    browser: { refreshRate: null },
    capturedAt: "2026-11-16T12:00:00.000Z",
  });
  settings.music = false;
  build.buildId = "other";
  expect(report).toMatchObject({
    schema: "citadel.performance",
    version: 1,
    build: { buildId: "content", dirty: true },
    context: { settings: { music: true } },
    audio: { schedule: null },
  });
  expect(JSON.parse(JSON.stringify(report))).toEqual(report);
  expect(report.notes.some((n) => n.includes("underruns"))).toBe(true);
});
