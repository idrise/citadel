import { chromium } from "@playwright/test";
import { writeFile } from "node:fs/promises";
import os from "node:os";
import { installVirtualBrowserControls } from "../tests/virtual-input.ts";
import { summariseFrames } from "./performance-summary.ts";

const options = Object.fromEntries(
  process.argv.slice(2).map((arg) => {
    const match = /^--([^=]+)=(.*)$/.exec(arg);
    if (!match) throw new Error(`Expected --name=value: ${arg}`);
    return [match[1], match[2]];
  }),
);
const devices = {
  desktop: { viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 },
  phone: {
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    hasTouch: true,
    isMobile: true,
  },
  tablet: {
    viewport: { width: 820, height: 1180 },
    deviceScaleFactor: 2,
    hasTouch: true,
    isMobile: true,
  },
};
const device = options.device ?? "desktop",
  profile = devices[device];
const seconds = Number(options.seconds ?? 60),
  level = Number(options.level ?? 1),
  seats = Number(options.seats ?? 6),
  seed = Number(options.seed ?? 51),
  quality = options.quality ?? "high";
if (
  !profile ||
  !Number.isFinite(seconds) ||
  seconds <= 0 ||
  !Number.isInteger(level) ||
  level < 1 ||
  level > 100 ||
  !Number.isInteger(seed) ||
  seed < 0 ||
  seed > 0xffffffff ||
  ![2, 3, 4, 6].includes(seats) ||
  !["low", "medium", "high"].includes(quality)
)
  throw new Error("Invalid device, seconds, level, seats, seed or quality");
const origin = options.url ?? "http://127.0.0.1:4173/",
  output = options.output ?? `/tmp/citadel-${device}-${level}-${quality}.json`;
const browser = await chromium.launch({ channel: "chromium" });
const context = await browser.newContext(profile);
const page = await context.newPage();
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
try {
  await page.addInitScript(installVirtualBrowserControls);
  await page.addInitScript(
    ({ level, seats, quality }) => {
      localStorage.setItem(
        "citadel.progress.v1",
        JSON.stringify({
          version: 3,
          level,
          count: seats,
          best: level,
          rounds: 1,
          losses: 0,
          demotion: null,
          recent: [{ level, count: seats, place: 1, at: 1 }],
        }),
      );
      localStorage.setItem(
        "citadel.solo.v1",
        JSON.stringify({
          version: 1,
          count: seats,
          humanSeat: 0,
          settings: { effectsQuality: quality },
        }),
      );
    },
    { level, seats, quality },
  );
  const before = Date.now();
  await page.goto(`${origin}?seed=${seed}`);
  await page.getByRole("button", { name: "Start", exact: true }).waitFor();
  const menuMs = Date.now() - before;
  if (!(await page.evaluate(() => typeof window.__citadelPerformance === "function")))
    throw new Error(
      "Frame capture is disabled in release builds. Use pnpm build:local and pnpm preview:local for this measurement.",
    );
  const metadata = await page.evaluate(() => ({
    userAgent: navigator.userAgent,
    dpr: devicePixelRatio,
    viewport: [innerWidth, innerHeight],
    build: window.__citadelPerformance().build,
  }));
  const start = Date.now();
  await page.getByRole("button", { name: "Start", exact: true }).click();
  const startDispatchMs = Date.now() - start;
  await page.waitForTimeout(5000);
  let cursor = 0,
    dropped = 0,
    activeMs = 0,
    restarts = 0;
  const frames = [],
    phases = {},
    deadline = Date.now() + Math.max(180, seconds * 4) * 1000;
  while (activeMs < seconds * 1000 && Date.now() < deadline) {
    await page.waitForTimeout(1000);
    const capture = await page.evaluate(() => ({
      report: window.__citadelPerformance(),
      phase: document.querySelector('[aria-label="Round phase"]')?.textContent,
      level: document.querySelector('[aria-label="Round level"]')?.textContent,
    }));
    const { totalFrames, recent } = capture.report;
    const delta = Math.max(0, totalFrames - cursor);
    if (cursor) {
      dropped += Math.max(0, delta - recent.length);
      const newFrames = delta ? recent.slice(-Math.min(delta, recent.length)) : [];
      for (const frame of newFrames) phases[frame.phase] = (phases[frame.phase] ?? 0) + 1;
      const activeFrames = newFrames.filter(
        (frame) => frame.phase === "playing" || frame.phase === "morph",
      );
      frames.push(...activeFrames);
      activeMs += activeFrames.reduce((sum, frame) => sum + frame.intervalMs, 0);
    }
    cursor = totalFrames;
    if (capture.phase === "finished") {
      await page.evaluate(() => window.__citadelTestInput.session.restart());
      await page.getByRole("button", { name: "Start", exact: true }).click();
      restarts++;
    }
  }
  const info = {
    created: new Date().toISOString(),
    build: metadata.build,
    platform: os.platform(),
    arch: os.arch(),
    cpu: os.cpus()[0]?.model,
    browser: browser.version(),
    device,
    emulated: device !== "desktop",
    level,
    seats,
    quality,
    seconds,
    activeMs,
    restarts,
    seed,
    warmupSeconds: 5,
    menuMs,
    startDispatchMs,
    metadata,
    phases,
    droppedFramesFromCollector: dropped,
    summary: summariseFrames(frames),
    frames,
    errors,
    limitations:
      "Phase comes from each frame. Emulation uses the host GPU and is not physical-device performance. GPU summaries use unique fresh asynchronous samples. Restarts preserve the seed and requested level.",
  };
  await writeFile(output, JSON.stringify(info, null, 2) + "\n");
  console.log(JSON.stringify({ output, ...info, frames: undefined }, null, 2));
  if (activeMs < seconds * 1000 || dropped || errors.length) process.exitCode = 1;
} finally {
  await context.close();
  await browser.close();
}
