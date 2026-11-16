import { MUSIC_LOOK_AHEAD } from "../apps/web/src/audio/schedule-window";
import { readFile, writeFile } from "node:fs/promises";
import { expect, test, type Page } from "./fixtures";
import { openGame, play, finishIntroduction, pause, configureGame } from "./helpers";
import type { runComparison } from "../apps/web/src/diagnostics/runner";
import type { createPerformanceReport } from "../apps/web/src/session/performance-report";
type Benchmark = Awaited<ReturnType<typeof runComparison>>;
async function downloadReport<T>(page: Page, label: string): Promise<T> {
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: label, exact: true }).click();
  const download = await pending;
  return JSON.parse(await readFile((await download.path())!, "utf8")) as T;
}
function installAudioReview() {
  const review = { contexts: [] as AudioContext[], peak: 0 };
  (window as unknown as { performanceAudioReview: typeof review }).performanceAudioReview = review;
  const Native = window.AudioContext;
  window.AudioContext = class extends Native {
    constructor(options?: AudioContextOptions) {
      super(options);
      review.contexts.push(this);
    }
  };
  const original = Object.getOwnPropertyDescriptor(AudioNode.prototype, "connect")!
    .value as typeof AudioNode.prototype.connect;
  AudioNode.prototype.connect = function (
    this: AudioNode,
    destination: AudioNode | AudioParam,
    ...args: number[]
  ) {
    const result = Reflect.apply(original, this, [destination, ...args]) as AudioNode | undefined;
    if (destination === this.context.destination) {
      const tap = this.context.createAnalyser();
      tap.fftSize = 4096;
      Reflect.apply(original, this, [tap]);
      const data = new Float32Array(tap.fftSize);
      const timer = setInterval(() => {
        if (tap.context.state === "closed") {
          clearInterval(timer);
          return;
        }
        tap.getFloatTimeDomainData(data);
        review.peak = Math.max(
          review.peak,
          Math.sqrt(data.reduce((sum, n) => sum + n * n, 0) / data.length),
        );
      }, 80);
    }
    return result;
  } as typeof original;
}
async function audioClosed(page: Page) {
  await expect
    .poll(() =>
      page.evaluate(() => {
        const review = (
          window as unknown as { performanceAudioReview: { contexts: AudioContext[] } }
        ).performanceAudioReview;
        return review.contexts.every((context) => context.state === "closed");
      }),
    )
    .toBe(true);
}
test("Pause exports served build and preserves active evidence while the menu keeps rendering", async ({
  page,
}, testInfo) => {
  await openGame(page);
  await play(page);
  await finishIntroduction(page);
  await page.clock.runFor(1500);
  await pause(page);
  const first = await downloadReport<ReturnType<typeof createPerformanceReport>>(
    page,
    "Save performance report",
  );
  await configureGame(page, { music: false, effectsQuality: "low" });
  await page.clock.runFor(2000);
  const second = await downloadReport<ReturnType<typeof createPerformanceReport>>(
    page,
    "Save performance report",
  );
  expect(first.schema).toBe("citadel.performance");
  expect(first.build.buildId).toMatch(/^[a-f0-9]{16}$/);
  expect(first.context.paused).toBe(true);
  expect(first.frames.summary.frames).toBeGreaterThan(0);
  expect(first.frames.phases.paused).toBeUndefined();
  expect(second.frames).toEqual(first.frames);
  expect(second.audio).toEqual(first.audio);
  expect(second.context.settings).toEqual(first.context.settings);
  expect(second.graphics).toEqual(first.graphics);
  expect((first.graphics as { shadows: boolean }).shadows).toBe(false);
  const popup = page.waitForEvent("popup");
  await page.getByRole("button", { name: "Run performance test", exact: true }).click();
  const tab = await popup;
  await expect(tab).toHaveURL(/diagnostics\.html$/);
  await expect(tab.getByRole("heading", { name: "Performance test", exact: true })).toBeVisible();
  await tab.close();
  await page.screenshot({ path: testInfo.outputPath("report-settings.png") });
});
test("live Tone scheduling comparison tolerates controlled stalls and closes every native context", async ({
  page,
}, testInfo) => {
  test.setTimeout(110000);
  await page.addInitScript(installAudioReview);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("./diagnostics.html");
  await page.evaluate(() => {
    localStorage.setItem("citadel.progress.v1", "progress sentinel");
    localStorage.setItem("citadel.solo.v1", "preferences sentinel");
  });
  const saved = await page.evaluate(() =>
    Object.fromEntries(Object.keys(localStorage).map((key) => [key, localStorage.getItem(key)])),
  );
  await page.locator('[name="comparison"]').selectOption("audio");
  await page.locator('[name="workload"]').selectOption("sixteen");
  await page.getByRole("button", { name: "Start test", exact: true }).click();
  await expect(page.getByRole("button", { name: "Save test report", exact: true })).toBeEnabled({
    timeout: 90000,
  });
  const report = await downloadReport<Benchmark>(page, "Save test report");
  expect(report.complete).toBe(true);
  expect(report.minimumDurationMet).toBe(true);
  expect(report.results.map((pass) => pass.workload.minBalls)).toEqual([16, 16]);
  expect(report.results[0]!.finalState).toEqual(report.results[1]!.finalState);
  const [old, current] = report.results;
  expect(old?.audio.end?.schedule?.lookAheadMs).toBe(40);
  expect(current?.audio.end?.schedule?.lookAheadMs).toBe(MUSIC_LOOK_AHEAD * 1000);
  expect(old?.controlledStalls).toBeGreaterThan(20);
  expect(current?.controlledStalls).toBeGreaterThan(20);
  expect(old?.audio.end?.schedule?.late).toBeGreaterThan(
    current?.audio.end?.schedule?.late ?? Infinity,
  );
  expect(current?.audio.end?.schedule?.late).toBe(0);
  expect(report.results.every((pass) => pass.audioAvailable)).toBe(true);
  expect(
    await page.evaluate(
      () =>
        (window as unknown as { performanceAudioReview: { peak: number } }).performanceAudioReview
          .peak,
    ),
  ).toBeGreaterThan(0.002);
  await audioClosed(page);
  expect(await page.locator("canvas").count()).toBe(0);
  expect(
    await page.evaluate(() =>
      Object.fromEntries(Object.keys(localStorage).map((key) => [key, localStorage.getItem(key)])),
    ),
  ).toEqual(saved);
  expect(errors).toEqual([]);
  await writeFile(testInfo.outputPath("audio-comparison.json"), JSON.stringify(report, null, 2));
  await page.screenshot({ path: testInfo.outputPath("audio-comparison.png") });
});
test("shortened comparisons, Stop and background interruption are honest and release resources", async ({
  page,
}, testInfo) => {
  test.setTimeout(45000);
  await page.addInitScript(installAudioReview);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("./diagnostics.html?seconds=1");
  await page.getByRole("button", { name: "Start test", exact: true }).click();
  await expect(page.getByRole("button", { name: "Save test report", exact: true })).toBeEnabled({
    timeout: 15000,
  });
  const short = await downloadReport<Benchmark>(page, "Save test report");
  expect(short.complete).toBe(true);
  expect(short.minimumDurationMet).toBe(false);
  expect(short.results.map((p) => p.settings.quality)).toEqual(["high", "low"]);
  await audioClosed(page);
  await page.goto("./diagnostics.html");
  await page.getByRole("button", { name: "Start test", exact: true }).click();
  await expect(page.locator("canvas")).toHaveCount(1);
  await page.getByRole("button", { name: "Stop test", exact: true }).click();
  await expect(page.getByRole("button", { name: "Save test report", exact: true })).toBeEnabled();
  const stopped = await downloadReport<Benchmark>(page, "Save test report");
  expect(stopped.complete).toBe(false);
  expect(stopped.minimumDurationMet).toBe(false);
  expect(stopped.results[0]?.reason).toBe("stopped");
  await audioClosed(page);
  await page.getByRole("button", { name: "Start test", exact: true }).click();
  await expect(page.locator("canvas")).toHaveCount(1);
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { configurable: true, get: () => true });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(page.getByRole("button", { name: "Save test report", exact: true })).toBeEnabled();
  const hidden = await downloadReport<Benchmark>(page, "Save test report");
  expect(hidden.complete).toBe(false);
  expect(hidden.results[0]?.reason).toContain("tab hidden");
  await audioClosed(page);
  expect(await page.locator("canvas").count()).toBe(0);
  expect(errors).toEqual([]);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: testInfo.outputPath("diagnostic-mobile.png") });
});
