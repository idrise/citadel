import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
const directory = process.argv[2] ?? "/tmp/citadel-level-intro",
  origin = process.argv[3] ?? "http://127.0.0.1:5176";
await mkdir(directory, { recursive: true });
const browser = await chromium.launch({ channel: "chromium" }),
  errors = [];
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.route("**/__level-intro-review", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: '<meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/src/app/styles.css?direct"><div id="review"></div>',
    }),
  );
  await page.goto(`${origin}/__level-intro-review`);
  const mount = async (
    count,
    level = 1,
    demoted = false,
    reduced = false,
    width = 1280,
    height = 900,
  ) => {
    await page.setViewportSize({ width, height });
    await page.evaluate(
      async ({ path, count, level, demoted, reduced, width, height }) => {
        window.introReview?.dispose();
        const { renderLevelIntroReview } = await import(`/@fs${path}`);
        window.introReview = renderLevelIntroReview(
          document.getElementById("review"),
          count,
          level,
          demoted,
          reduced,
          width,
          height,
        );
      },
      {
        path: fileURLToPath(new URL("./level-intro-review.ts", import.meta.url)),
        count,
        level,
        demoted,
        reduced,
        width,
        height,
      },
    );
  };
  for (const count of [2, 4, 6]) {
    await mount(count);
    for (const [label, time] of [
      ["buried", 0],
      ["rising", 0.2],
      ["raised", 0.65],
      ["sinking", 1.3],
      ["playing", 1.51],
    ]) {
      await page.evaluate((time) => window.introReview.advance(time), time);
      await page.screenshot({ path: `${directory}/${label}-${count}.png` });
    }
  }
  await mount(4, 7, true);
  await page.evaluate(() => window.introReview.advance(0.65));
  await page.screenshot({ path: `${directory}/demoted-07.png` });
  await mount(6, 100, false, false, 390, 844);
  await page.evaluate(() => window.introReview.advance(0.65));
  await page.screenshot({ path: `${directory}/phone-level-100.png` });
  await mount(2, 1, false, true);
  await page.screenshot({ path: `${directory}/reduced-level-01.png` });
  await mount(4);
  const video = await page.evaluate(async () => {
    const recorder = new MediaRecorder(document.querySelector("canvas").captureStream(30), {
      mimeType: "video/webm;codecs=vp9",
      videoBitsPerSecond: 2500000,
    });
    const chunks = [];
    recorder.ondataavailable = (e) => chunks.push(e.data);
    recorder.start();
    for (let frame = 0; frame <= 54; frame++) {
      window.introReview.advance(frame / 30);
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
  await writeFile(`${directory}/floor-level-introduction.webm`, Buffer.from(video, "base64"));
  await page.evaluate(() => window.introReview.dispose());
  assert.deepEqual(errors, []);
  await writeFile(
    `${directory}/render-report.json`,
    JSON.stringify(
      {
        kind: "Native GPU pose fixture; actual arena, world lettering, countdown and planar reflections",
        cases: [2, 4, 6, "demotion", "phone-100", "reduced-01"],
        errors,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(JSON.stringify({ errors }));
} finally {
  await browser.close();
}
