import { chromium } from "@playwright/test";
import { writeFile } from "node:fs/promises";
const browser = await chromium.launch({ channel: "chromium" });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } }),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.stack));
  await page.addInitScript(() => {
    window.audioTaps = [];
    const original = Object.getOwnPropertyDescriptor(AudioNode.prototype, "connect")?.value;
    if (typeof original !== "function") throw new Error("Native audio connection is unavailable");
    AudioNode.prototype.connect = function (destination, ...args) {
      const result = Reflect.apply(original, this, [destination, ...args]);
      if (destination === this.context.destination) {
        const tap = this.context.createAnalyser();
        tap.fftSize = 4096;
        Reflect.apply(original, this, [tap]);
        window.audioTaps.push(tap);
      }
      return result;
    };
  });
  await page.goto(process.argv[3] ?? "http://127.0.0.1:5173");
  await page.getByLabel("Players", { exact: true }).selectOption("6");
  await page.getByText("Settings", { exact: true }).click();
  await page.getByLabel("Your fortress", { exact: true }).selectOption("5");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.getByLabel("Music status", { exact: true }).filter({ hasText: "playing" }).waitFor();
  await new Promise((resolve) => setTimeout(resolve, 2500));
  const metrics = await page.evaluate(
    () =>
      new Promise((resolve) => {
        const times = [];
        let previous = performance.now(),
          start = previous,
          maxRms = 0;
        const sample = (now) => {
          times.push(now - previous);
          previous = now;
          for (const tap of window.audioTaps)
            if (tap.context.state === "running") {
              const data = new Float32Array(tap.fftSize);
              tap.getFloatTimeDomainData(data);
              maxRms = Math.max(
                maxRms,
                Math.sqrt(data.reduce((sum, x) => sum + x * x, 0) / data.length),
              );
            }
          if (now - start < 10000) requestAnimationFrame(sample);
          else {
            const ordered = times.slice(5).sort((a, b) => a - b);
            resolve({
              samples: ordered.length,
              medianMs: ordered[Math.floor(ordered.length * 0.5)],
              p95Ms: ordered[Math.floor(ordered.length * 0.95)],
              maxOutputRms: maxRms,
            });
          }
        };
        requestAnimationFrame(sample);
      }),
  );
  const gl = await page.evaluate(() => {
    const ctx = document.querySelector("canvas").getContext("webgl2"),
      ext = ctx.getExtension("WEBGL_debug_renderer_info");
    return ext ? ctx.getParameter(ext.UNMASKED_RENDERER_WEBGL) : "unavailable";
  });
  const status = await page.getByLabel("Music status", { exact: true }).textContent();
  const report = {
    kind: "Native requestAnimationFrame, no emulated clock; 1280x900, six seats, human seat 5, bloom/reflections/music enabled, desktop Chromium",
    browser: browser.version(),
    renderer: gl,
    ...metrics,
    status,
    errors,
  };
  await writeFile(
    process.argv[2] ?? "/tmp/citadel-native.json",
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(JSON.stringify(report));
} finally {
  await browser.close();
}
