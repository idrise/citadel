import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
const origin = process.argv[2] ?? "http://localhost:5177",
  directory = "docs/reviews/m09/triangle-rally";
await mkdir(directory, { recursive: true });
const browser = await chromium.launch({ channel: "chromium" });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } }),
    errors = [],
    poses = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route("**/__triangle-rally", (r) =>
    r.fulfill({
      contentType: "text/html",
      body: '<link rel="stylesheet" href="/src/app/styles.css?direct"><div id="review"></div>',
    }),
  );
  await page.goto(`${origin}/__triangle-rally`);
  for (const count of [2, 3, 4, 6])
    for (const before of count === 3 ? [true, false] : [false]) {
      await page.evaluate(
        async ({ path, count, before }) => {
          window.triangleReview?.dispose();
          const { triangleClearanceReview } = await import(`/@fs${path}`);
          window.triangleReview = triangleClearanceReview(
            document.getElementById("review"),
            count,
            before,
          );
        },
        {
          path: fileURLToPath(new URL("./triangle-rally-review.ts", import.meta.url)),
          count,
          before,
        },
      );
      poses.push(await page.evaluate(() => window.triangleReview.summary()));
      for (const side of [0, 1]) {
        await page.evaluate((side) => window.triangleReview.render(side), side);
        await page.screenshot({
          path: `${directory}/${count}-${before ? "before" : "after"}-${side}.png`,
        });
      }
    }
  await page.evaluate(
    async (path) => {
      window.triangleReview?.dispose();
      const { naturalRallyReview } = await import(`/@fs${path}`);
      window.triangleReview = naturalRallyReview(document.getElementById("review"));
    },
    fileURLToPath(new URL("./triangle-rally-review.ts", import.meta.url)),
  );
  const samples = [],
    scores = [];
  let maximum = 0;
  for (let second = 1; second <= 80; second++) {
    const result = await page.evaluate((second) => window.triangleReview.advance(second), second);
    samples.push(result.sample);
    scores.push(...result.scores);
    maximum = Math.max(maximum, ...result.sample.balls.map((b) => b.speed));
    if (second === 18) await page.screenshot({ path: `${directory}/natural-rally.png` });
    if (result.sample.phase === "finished") break;
  }
  assert.ok(maximum > 14, "natural play should demonstrate a rally speed increase");
  assert.ok(scores.length > 0, "natural play should score");
  assert.ok(scores.every((s) => s.collisionCaps === 0));
  assert.ok(
    scores.every(
      (s) =>
        s.phase === "finished" ||
        s.balls.some((b) => b.phase === "ready" && b.rallyTime === 0 && b.speed === 0),
    ),
  );
  await page.evaluate(
    async (path) => {
      window.triangleReview.dispose();
      const { naturalRallyReview } = await import(`/@fs${path}`);
      window.triangleReview = naturalRallyReview(document.getElementById("review"));
      window.triangleReview.advance(14);
    },
    fileURLToPath(new URL("./triangle-rally-review.ts", import.meta.url)),
  );
  const movie = await page.evaluate(async () => {
    const recorder = new MediaRecorder(document.querySelector("canvas").captureStream(30), {
        mimeType: "video/webm;codecs=vp9",
        videoBitsPerSecond: 2000000,
      }),
      chunks = [];
    recorder.ondataavailable = (event) => chunks.push(event.data);
    recorder.start();
    for (let frame = 0; frame <= 240; frame++) {
      window.triangleReview.advance(14 + frame / 30);
      await new Promise((resolve) => setTimeout(resolve, 1000 / 30));
    }
    await new Promise((resolve) => {
      recorder.onstop = resolve;
      recorder.stop();
    });
    const bytes = new Uint8Array(await new Blob(chunks).arrayBuffer());
    let binary = "";
    for (let index = 0; index < bytes.length; index += 16384)
      binary += String.fromCharCode(...bytes.subarray(index, index + 16384));
    return btoa(binary);
  });
  await writeFile(`${directory}/natural-rally.webm`, Buffer.from(movie, "base64"));
  await page.evaluate(() => window.triangleReview.dispose());
  await writeFile(
    `${directory}/report.json`,
    JSON.stringify({ poses, samples, scores, maximum, errors }, null, 2) + "\n",
  );
  assert.deepEqual(errors, []);
  console.log({ maximum, scores: scores.length, errors });
} finally {
  await browser.close();
}
