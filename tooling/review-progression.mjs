import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
const directory = process.argv[2] ?? "/tmp/citadel-progression-review",
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
  await page.route("**/__progression-review", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: '<meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/src/app/styles.css?direct"><div id="review"></div>',
    }),
  );
  await page.goto(`${origin}/__progression-review`);
  const mount = async (count, level = 1, reduced = false, width = 1280, height = 900) => {
    await page.setViewportSize({ width, height });
    await page.evaluate(
      async ({ path, count, level, reduced, width, height }) => {
        const { renderProgressionReview } = await import(`/@fs${path}`);
        window.progressReview?.dispose();
        window.progressReview = renderProgressionReview(
          document.getElementById("review"),
          count,
          level,
          reduced,
          width,
          height,
        );
      },
      {
        path: fileURLToPath(new URL("./progression-review.ts", import.meta.url)),
        count,
        level,
        reduced,
        width,
        height,
      },
    );
  };
  for (const count of [2, 4, 6]) {
    await mount(count);
    await page.screenshot({ path: `${directory}/level-${count}.png` });
    await page.evaluate(() => window.progressReview.advance(1.8));
    await page.screenshot({ path: `${directory}/fall-${count}.png` });
    const transfer = await page.evaluate(() => {
      window.progressReview.advance(2.95);
      return window.progressReview.summary();
    });
    assert.ok(
      transfer.warmFloodFraction < 0.15,
      `Transfer flooded the screen: ${transfer.warmFloodFraction}`,
    );
    await page.screenshot({ path: `${directory}/transfer-${count}.png` });
    await page.evaluate(() => window.progressReview.advance(3.6));
    await page.screenshot({ path: `${directory}/awarded-${count}.png` });
    const summary = await page.evaluate(() => window.progressReview.summary());
    assert.equal(summary.collections, 1);
    assert.equal(summary.health, 4);
    checks.push({
      count,
      collections: summary.collections,
      health: summary.health,
      transferWarmFloodFraction: transfer.warmFloodFraction,
    });
  }
  await mount(6, 100, false, 390, 844);
  await page.screenshot({ path: `${directory}/mobile-level-100.png` });
  await page.evaluate(() => window.progressReview.advance(3.6));
  await page.screenshot({ path: `${directory}/mobile-award.png` });
  await mount(4, 1, true);
  await page.evaluate(() => window.progressReview.advance(2.95));
  await page.screenshot({ path: `${directory}/reduced-award.png` });
  await mount(4);
  await page.evaluate(async () => {
    const recorder = new MediaRecorder(document.querySelector("canvas").captureStream(30), {
      mimeType: "video/webm;codecs=vp9",
      videoBitsPerSecond: 2500000,
    });
    const chunks = [];
    recorder.ondataavailable = (e) => chunks.push(e.data);
    recorder.start();
    for (let frame = 0; frame <= 135; frame++) {
      window.progressReview.advance(frame / 30);
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
    window.progressVideo = btoa(binary);
  });
  await writeFile(
    `${directory}/supplies.webm`,
    Buffer.from(await page.evaluate(() => window.progressVideo), "base64"),
  );
  await page.evaluate(() => window.progressReview.dispose());
  assert.deepEqual(errors, []);
  await writeFile(
    `${directory}/render-report.json`,
    JSON.stringify(
      {
        kind: "Staged native GPU fixture; real collection collision and health award",
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
