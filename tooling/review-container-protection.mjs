import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { installVirtualBrowserControls } from "../tests/virtual-input.ts";
const origin = process.argv[2] ?? "http://127.0.0.1:5181";
const directory = "artifacts/reviews/m09/container-protection";
await mkdir(directory, { recursive: true });
const browser = await chromium.launch({ channel: "chromium" });
const errors = [],
  samples = [];
try {
  for (const touch of [false, true]) {
    const page = await browser.newPage({
      viewport: touch ? { width: 390, height: 844 } : { width: 1280, height: 900 },
      hasTouch: touch,
      isMobile: touch,
    });
    await page.addInitScript(installVirtualBrowserControls);
    page.on("pageerror", (e) => errors.push(e.message));
    await page.route("**/__protection-review", (route) =>
      route.fulfill({
        contentType: "text/html",
        body: '<meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/src/app/styles.css?direct"><div id="review"></div>',
      }),
    );
    await page.goto(`${origin}/__protection-review`);
    for (const count of [2, 4, 6])
      for (const { seat, quality, reduced, name } of [
        { seat: 0, quality: "high", reduced: false, name: "human" },
        ...(count === 6
          ? [
              { seat: 1, quality: "high", reduced: false, name: "bot" },
              { seat: 0, quality: "low", reduced: false, name: "low" },
              { seat: 0, quality: "high", reduced: true, name: "reduced" },
            ]
          : []),
      ]) {
        await page.evaluate(
          async ({ path, count, seat, quality, reduced }) => {
            window.protectionReview?.dispose();
            const { containerProtectionReview } = await import(`/@fs${path}`);
            window.protectionReview = containerProtectionReview(
              document.getElementById("review"),
              count,
              seat,
              quality,
              reduced,
            );
          },
          {
            path: fileURLToPath(new URL("./container-protection-review.ts", import.meta.url)),
            count,
            seat,
            quality,
            reduced,
          },
        );
        for (const [phase, time] of [
          ["bright", 0.04],
          ["dim", 1 / 3],
          ["expired", 2.05],
        ]) {
          const sample = await page.evaluate((time) => window.protectionReview.advance(time), time);
          assert.equal(sample.protected, phase !== "expired");
          assert.equal(sample.health, 2);
          assert.equal(sample.caps, 0);
          samples.push({ touch, phase, ...sample });
          if (phase === "bright" || (count === 6 && name === "human"))
            await page.screenshot({
              path: `${directory}/${touch ? "phone" : "desktop"}-${count}-${name}-${phase}.png`,
            });
        }
      }
    await page.evaluate(() => window.protectionReview.dispose());
    await page.close();
  }
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: { dir: `${directory}/video`, size: { width: 1280, height: 720 } },
  });
  await context.addInitScript(installVirtualBrowserControls);
  const page = await context.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route("**/__protection-clip", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: '<link rel="stylesheet" href="/src/app/styles.css?direct"><div id="review"></div>',
    }),
  );
  await page.goto(`${origin}/__protection-clip`);
  const end = await page.evaluate(
    async (path) => {
      const { containerProtectionReview } = await import(`/@fs${path}`);
      const view = containerProtectionReview(document.getElementById("review"), 6);
      const start = performance.now();
      const result = await new Promise((resolve) => {
        const draw = (now) => {
          const time = (now - start) / 1000;
          const sample = view.advance(time);
          if (time < 2.4) requestAnimationFrame(draw);
          else resolve(sample);
        };
        requestAnimationFrame(draw);
      });
      view.dispose();
      return result;
    },
    fileURLToPath(new URL("./container-protection-review.ts", import.meta.url)),
  );
  assert.equal(end.protected, false);
  assert.equal(end.health, 2);
  const video = page.video();
  await context.close();
  await video.saveAs(`${directory}/pulse.webm`);
  await video.delete();
  assert.deepEqual(errors, []);
  await writeFile(`${directory}/report.json`, JSON.stringify({ samples, errors }, null, 2) + "\n");
  console.log({ samples: samples.length, errors });
} finally {
  await browser.close();
}
