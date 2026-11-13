import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
const directory = "docs/reviews/m09/briefing-timing",
  origin = process.argv[2] ?? "http://localhost:5177";
await mkdir(directory, { recursive: true });
const browser = await chromium.launch({ channel: "chromium" }),
  errors = [],
  samples = [];
try {
  for (const mobile of [false, true]) {
    const page = await browser.newPage({
      viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 900 },
      hasTouch: mobile,
      isMobile: mobile,
    });
    page.on("pageerror", (error) => errors.push(error.message));
    await page.route("**/__reading", (route) =>
      route.fulfill({
        contentType: "text/html",
        body: '<meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/src/app/styles.css?direct"><div id="review"></div>',
      }),
    );
    await page.goto(`${origin}/__reading`);
    for (const [count, level, loss] of [
      [2, 1, 1],
      [4, 100, 99],
      [6, 8, 7],
    ]) {
      const duration = await page.evaluate(
        async ({ path, count, level, loss, size }) => {
          window.readingView?.dispose();
          const { renderLevelIntroReview } = await import(`/@fs${path}`);
          window.readingView = renderLevelIntroReview(
            document.getElementById("review"),
            count,
            level,
            false,
            false,
            size.width,
            size.height,
            loss,
          );
          window.readingView.advance(window.readingView.duration - 0.5);
          return window.readingView.duration;
        },
        {
          path: fileURLToPath(new URL("./level-intro-review.ts", import.meta.url)),
          count,
          level,
          loss,
          size: page.viewportSize(),
        },
      );
      assert.ok(duration >= 4);
      samples.push({ mobile, count, level, loss, duration, capturedAt: duration - 0.5 });
      await page.screenshot({
        path: `${directory}/${mobile ? "phone" : "desktop"}-${count}-late-hold.png`,
      });
    }
    if (mobile) {
      await page.evaluate(() => window.readingView.advance(0));
      const video = await page.evaluate(async () => {
        const recorder = new MediaRecorder(document.querySelector("canvas").captureStream(30), {
            mimeType: "video/webm;codecs=vp9",
            videoBitsPerSecond: 1500000,
          }),
          chunks = [];
        recorder.ondataavailable = (e) => chunks.push(e.data);
        recorder.start();
        for (let frame = 0; frame <= Math.ceil((window.readingView.duration + 0.3) * 30); frame++) {
          window.readingView.advance(frame / 30);
          await new Promise((resolve) => setTimeout(resolve, 1000 / 30));
        }
        await new Promise((resolve) => {
          recorder.onstop = resolve;
          recorder.stop();
        });
        const bytes = new Uint8Array(await new Blob(chunks).arrayBuffer());
        let binary = "";
        for (let i = 0; i < bytes.length; i += 16384)
          binary += String.fromCharCode(...bytes.subarray(i, i + 16384));
        return btoa(binary);
      });
      await writeFile(`${directory}/phone-reading-window.webm`, Buffer.from(video, "base64"));
    }
    await page.evaluate(() => window.readingView.dispose());
    await page.close();
  }
  assert.deepEqual(errors, []);
  await writeFile(
    `${directory}/report.json`,
    JSON.stringify(
      {
        kind: "Authored actual countdown renders near the end of the fully raised reading hold",
        samples,
        errors,
      },
      null,
      2,
    ) + "\n",
  );
  console.log({ samples: samples.length, errors });
} finally {
  await browser.close();
}
