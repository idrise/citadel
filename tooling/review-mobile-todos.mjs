import assert from "node:assert/strict";
import { chromium, webkit } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
const origin = process.argv[2] ?? "http://localhost:5177";
const directory = process.argv[3] ?? "docs/reviews/m09/mobile-todos";
const engine = process.argv[4] === "webkit" ? "webkit" : "chromium";
await mkdir(directory, { recursive: true });
const browser = await (engine === "webkit" ? webkit : chromium).launch(
  engine === "chromium" ? { channel: "chromium" } : {},
);
const reports = [],
  errors = [];
try {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();
  page.on("pageerror", (e) => errors.push(e.stack));
  await page.addInitScript(() => {
    window.reviewTaps = [];
    window.reviewDraws = 0;
    for (const name of [
      "drawArrays",
      "drawElements",
      "drawArraysInstanced",
      "drawElementsInstanced",
    ]) {
      const original = WebGL2RenderingContext.prototype[name];
      WebGL2RenderingContext.prototype[name] = function (...args) {
        window.reviewDraws++;
        return Reflect.apply(original, this, args);
      };
    }
    const connect = Object.getOwnPropertyDescriptor(AudioNode.prototype, "connect").value;
    AudioNode.prototype.connect = function (destination, ...args) {
      const result = Reflect.apply(connect, this, [destination, ...args]);
      if (destination === this.context.destination) {
        const tap = this.context.createAnalyser();
        tap.fftSize = 2048;
        Reflect.apply(connect, this, [tap]);
        window.reviewTaps.push(tap);
      }
      return result;
    };
  });
  await page.goto(`${origin}/?seed=2026`);
  const choose = async (count) => {
    let current = Number(await page.getByLabel("Player count", { exact: true }).textContent());
    while (current !== count) {
      await page
        .getByRole("button", {
          name: count > current ? "Increase players" : "Decrease players",
          exact: true,
        })
        .tap();
      current += Math.sign(count - current);
    }
  };
  for (const count of [2, 4, 6]) {
    await choose(count);
    await page.waitForTimeout(1100);
    await page.screenshot({ path: `${directory}/${engine}-portrait-${count}-title.png` });
  }
  await page.getByRole("button", { name: "Start", exact: true }).tap();
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${directory}/${engine}-portrait-6-play.png` });
  const metrics = await page.evaluate(
    () =>
      new Promise((resolve) => {
        const frames = [],
          draws = [],
          stalls = [];
        let previous = performance.now(),
          start = previous,
          rms = 0;
        window.reviewDraws = 0;
        const sample = (now) => {
          frames.push(now - previous);
          draws.push(window.reviewDraws);
          window.reviewDraws = 0;
          previous = now;
          if (frames.at(-1) > 250) stalls.push(frames.at(-1));
          for (const tap of window.reviewTaps)
            if (tap.context.state === "running") {
              const data = new Float32Array(tap.fftSize);
              tap.getFloatTimeDomainData(data);
              rms = Math.max(rms, Math.sqrt(data.reduce((sum, x) => sum + x * x, 0) / data.length));
            }
          if (now - start < 8000) requestAnimationFrame(sample);
          else {
            frames.sort((a, b) => a - b);
            draws.sort((a, b) => a - b);
            resolve({
              samples: frames.length,
              medianMs: frames[Math.floor(frames.length * 0.5)],
              p95Ms: frames[Math.floor(frames.length * 0.95)],
              maxMs: frames.at(-1),
              medianDraws: draws[Math.floor(draws.length * 0.5)],
              maxOutputRms: rms,
              stalls,
            });
          }
        };
        requestAnimationFrame(sample);
      }),
  );
  reports.push({
    engine,
    browser: browser.version(),
    layout: "390x844@2, six seats, default high effects, live audio; native clock",
    ...metrics,
  });
  await page.setViewportSize({ width: 844, height: 390 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `${directory}/${engine}-landscape-6-play.png` });
  assert.deepEqual(errors, []);
  assert.ok(metrics.maxOutputRms > 0.002, "native output must be audible");
  assert.ok(metrics.samples > 0 && metrics.medianDraws > 0, "sample real rendered frames");
  console.log(JSON.stringify({ reports, errors }));
  await writeFile(
    `${directory}/${engine}-native.json`,
    JSON.stringify({ reports, errors }, null, 2) + "\n",
  );
} finally {
  await browser.close();
}
