import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
const directory = "docs/reviews/m09/paddle-aim",
  origin = process.argv[2] ?? "http://localhost:5177";
await mkdir(directory, { recursive: true });
const browser = await chromium.launch({ channel: "chromium" }),
  samples = [],
  errors = [];
try {
  for (const mobile of [false, true]) {
    const page = await browser.newPage({
      viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 900 },
      hasTouch: mobile,
      isMobile: mobile,
    });
    page.on("pageerror", (error) => errors.push(error.message));
    await page.route("**/__paddle-aim", (route) =>
      route.fulfill({
        contentType: "text/html",
        body: '<meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/src/app/styles.css?direct"><div id="review"></div>',
      }),
    );
    await page.goto(`${origin}/__paddle-aim`);
    for (const [count, offset] of [
      [2, 0],
      [4, -0.75],
      [4, 0],
      [4, 0.75],
      [6, 0],
    ]) {
      const sample = await page.evaluate(
        async ({ path, count, offset, size }) => {
          window.paddleView?.dispose();
          const { renderPaddleAimReview } = await import(`/@fs${path}`);
          window.paddleView = renderPaddleAimReview(
            document.getElementById("review"),
            count,
            offset,
            size.width,
            size.height,
          );
          return window.paddleView.summary();
        },
        {
          path: fileURLToPath(new URL("./paddle-aim-review.ts", import.meta.url)),
          count,
          offset,
          size: page.viewportSize(),
        },
      );
      samples.push({ mobile, ...sample });
      await page.screenshot({
        path: `${directory}/${mobile ? "phone" : "desktop"}-${count}-${offset < 0 ? "left" : offset > 0 ? "right" : "centre"}.png`,
      });
    }
    await page.evaluate(() => window.paddleView.dispose());
    await page.close();
  }
  assert.deepEqual(errors, []);
  await writeFile(
    `${directory}/report.json`,
    JSON.stringify(
      {
        kind: "Authored parallel incoming balls; actual collision and live return preview",
        samples,
        errors,
      },
      null,
      2,
    ) + "\n",
  );
  console.log({ samples, errors });
} finally {
  await browser.close();
}
