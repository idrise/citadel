import { chromium } from "@playwright/test";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
const origin = process.argv.find((arg) => arg.startsWith("http")) ?? "http://localhost:5177",
  directory = "docs/reviews/m09/roster-variety";
await mkdir(directory, { recursive: true });
const performanceOnly = process.argv.includes("--performance-only");
const prior = performanceOnly
  ? JSON.parse(await readFile(`${directory}/report.json`, "utf8"))
  : null;
const browser = await chromium.launch({ channel: "chromium" }),
  errors = [],
  layouts = prior?.layouts ?? [],
  performanceSamples = [];
try {
  for (const mobile of [false, true]) {
    const page = await browser.newPage({
      viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 900 },
      hasTouch: mobile,
      isMobile: mobile,
    });
    page.on("pageerror", (e) => errors.push(e.message));
    await page.route("**/__roster", (route) =>
      route.fulfill({
        contentType: "text/html",
        body: '<meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/src/app/styles.css?direct"><div id="review"></div>',
      }),
    );
    await page.goto(`${origin}/__roster`);
    const cases = [
      ...[2, 4, 6].flatMap((count) => [4, 6].map((level) => [count, level])),
      ...[8, 12, 16].flatMap((count) => [1, 2, 3, 4, 6].map((level) => [count, level])),
    ];
    for (const [count, level] of performanceOnly ? [] : cases) {
      const summary = await page.evaluate(
        async ({ path, count, level, size }) => {
          window.reviewView?.dispose();
          const { renderArenaVariantReview } = await import(`/@fs${path}`);
          window.reviewView = renderArenaVariantReview(
            document.getElementById("review"),
            count,
            level,
            size.width,
            size.height,
          );
          return window.reviewView.summary();
        },
        {
          path: fileURLToPath(new URL("./arena-variant-review.ts", import.meta.url)),
          count,
          level,
          size: page.viewportSize(),
        },
      );
      layouts.push({ mobile, ...summary });
      await page.screenshot({
        path: `${directory}/${mobile ? "phone" : "desktop"}-${count}-${summary.shape}.png`,
      });
    }
    for (const count of [6, 8, 12, 16]) {
      const sample = await page.evaluate(
        async ({ path, count, size }) => {
          window.reviewView?.dispose();
          const { createRosterReview } = await import(`/@fs${path}`);
          window.reviewView = createRosterReview(
            document.getElementById("review"),
            count,
            size.width,
            size.height,
          );
          return window.reviewView.run();
        },
        {
          path: fileURLToPath(new URL("./roster-review.ts", import.meta.url)),
          count,
          size: page.viewportSize(),
        },
      );
      assert.equal(sample.collisionCaps, 0);
      assert.equal(sample.balls, 16);
      performanceSamples.push({ mobile, ...sample });
      await page.screenshot({
        path: `${directory}/${mobile ? "phone" : "desktop"}-${count}-sixteen-balls.png`,
      });
    }
    await page.evaluate(() => window.reviewView.dispose());
    await page.close();
  }
  assert.deepEqual(errors, []);
  await writeFile(
    `${directory}/report.json`,
    JSON.stringify(
      {
        kind: "Authored level views and real fixed-step bot stress frames; local hardware only",
        layouts,
        warmupFrames: 15,
        measurementConditions:
          "One isolated automated browser; high profile with ordinary mobile budget; short local hardware samples, not physical-device validation",
        performanceSamples,
        errors,
      },
      null,
      2,
    ) + "\n",
  );
  console.log({ layouts: layouts.length, performanceSamples, errors });
} finally {
  await browser.close();
}
