import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
const directory = process.argv[2] ?? "/tmp/citadel-difficulty-review",
  origin = process.argv[3] ?? "http://127.0.0.1:5176";
await mkdir(directory, { recursive: true });
const browser = await chromium.launch({ channel: "chromium" }),
  errors = [],
  checks = [];
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.route("**/__difficulty-review", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: '<meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/src/app/styles.css?direct"><div id="review"></div>',
    }),
  );
  await page.goto(`${origin}/__difficulty-review`);
  const mount = async (count, level, width = 1280, height = 900) => {
    await page.setViewportSize({ width, height });
    await page.evaluate(
      async ({ path, count, level, width, height }) => {
        window.difficultyReview?.dispose();
        const { renderDifficultyReview } = await import(`/@fs${path}`);
        window.difficultyReview = renderDifficultyReview(
          document.getElementById("review"),
          count,
          level,
          width,
          height,
        );
      },
      {
        path: fileURLToPath(new URL("./difficulty-review.ts", import.meta.url)),
        count,
        level,
        width,
        height,
      },
    );
  };
  for (const count of [2, 4, 6])
    for (const level of [1, 50, 100]) {
      await mount(count, level);
      await page.evaluate(() => window.difficultyReview.advance(0.65));
      await page.screenshot({ path: `${directory}/intro-${count}-level-${level}.png` });
      checks.push(await page.evaluate(() => window.difficultyReview.summary()));
    }
  for (const level of [4, 5]) {
    await mount(4, level);
    await page.evaluate(() => window.difficultyReview.advance(6.1));
    const summary = await page.evaluate(() => window.difficultyReview.summary());
    assert.equal(summary.supplies, level === 4 ? 0 : 1);
    await page.screenshot({ path: `${directory}/pickup-gate-${level}.png` });
    checks.push(summary);
  }
  await mount(6, 100);
  await page.evaluate(() => window.difficultyReview.advance(37));
  const pressure = await page.evaluate(() => window.difficultyReview.summary());
  assert.equal(pressure.balls, 8);
  assert.equal(pressure.collisionCaps, 0);
  checks.push(pressure);
  await page.screenshot({ path: `${directory}/eight-ball-pressure.png` });
  const video = await page.evaluate(async () => {
    const recorder = new MediaRecorder(document.querySelector("canvas").captureStream(30), {
        mimeType: "video/webm;codecs=vp9",
        videoBitsPerSecond: 2500000,
      }),
      chunks = [];
    recorder.ondataavailable = (e) => chunks.push(e.data);
    recorder.start();
    for (let frame = 0; frame <= 90; frame++) {
      window.difficultyReview.advance(37 + frame / 30);
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
  await writeFile(`${directory}/level-100-pressure.webm`, Buffer.from(video, "base64"));
  await mount(6, 100, 390, 844);
  await page.evaluate(() => window.difficultyReview.advance(0.65));
  await page.screenshot({ path: `${directory}/phone-level-100.png` });
  await page.evaluate(() => window.difficultyReview.dispose());
  assert.deepEqual(errors, []);
  await writeFile(
    `${directory}/render-report.json`,
    JSON.stringify(
      {
        kind: "Natural seeded graded simulation; late frame history warmed for rendering only",
        checks,
        errors,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(JSON.stringify({ pressure, errors }));
} finally {
  await browser.close();
}
