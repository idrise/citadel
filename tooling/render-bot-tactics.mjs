import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
const directory = process.argv[2] ?? "/tmp/citadel-bot-tactics",
  origin = process.argv[3] ?? "http://127.0.0.1:5176";
await mkdir(directory, { recursive: true });
const browser = await chromium.launch({ channel: "chromium" });
const errors = [],
  checks = [];
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.route("**/__bot-tactics-review", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: '<meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/src/app/styles.css?direct"><div id="review"></div>',
    }),
  );
  await page.goto(`${origin}/__bot-tactics-review`);
  const mount = async (count, width = 1280, height = 900) => {
    await page.setViewportSize({ width, height });
    await page.evaluate(
      async ({ path, count, width, height }) => {
        window.botReview?.dispose();
        const { renderBotTacticsReview } = await import(`/@fs${path}`);
        window.botReview = renderBotTacticsReview(
          document.getElementById("review"),
          count,
          width,
          height,
        );
      },
      {
        path: fileURLToPath(new URL("./bot-tactics-review.ts", import.meta.url)),
        count,
        width,
        height,
      },
    );
  };
  for (const count of [2, 4, 6]) {
    await mount(count);
    await page.screenshot({ path: `${directory}/incoming-${count}.png` });
    for (let frame = 1; frame <= 10; frame++)
      await page.evaluate((t) => window.botReview.advance(t), frame / 30);
    await page.screenshot({ path: `${directory}/curve-${count}.png` });
    for (let frame = 11; frame <= 33; frame++)
      await page.evaluate((t) => window.botReview.advance(t), frame / 30);
    await page.screenshot({ path: `${directory}/collected-${count}.png` });
    const summary = await page.evaluate(() => window.botReview.summary());
    assert.ok(summary.spin > 1);
    assert.equal(summary.collections, 1);
    assert.equal(summary.health, 4);
    assert.equal(summary.caps, 0);
    checks.push(summary);
  }
  await mount(6, 390, 844);
  for (let frame = 1; frame <= 33; frame++)
    await page.evaluate((t) => window.botReview.advance(t), frame / 30);
  await page.screenshot({ path: `${directory}/phone-collected.png` });
  await mount(4);
  const recording = await page.evaluate(async () => {
    const recorder = new MediaRecorder(document.querySelector("canvas").captureStream(30), {
      mimeType: "video/webm;codecs=vp9",
      videoBitsPerSecond: 2500000,
    });
    const chunks = [];
    recorder.ondataavailable = (e) => chunks.push(e.data);
    recorder.start();
    for (let frame = 0; frame <= 45; frame++) {
      window.botReview.advance(frame / 30);
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
  await writeFile(`${directory}/curved-pickup.webm`, Buffer.from(recording, "base64"));
  await page.evaluate(() => window.botReview.dispose());
  assert.deepEqual(errors, []);
  await writeFile(
    `${directory}/render-report.json`,
    JSON.stringify(
      {
        kind: "Staged incoming ball; normal level-100 bot movement, curve and pickup physics",
        checks,
        errors,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(JSON.stringify({ checks, errors }));
} finally {
  await browser.close();
}
