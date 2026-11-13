import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
const directory = "docs/reviews/m09/arena-variant",
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
    page.on("pageerror", (e) => errors.push(e.message));
    await page.route("**/__arena-variant", (r) =>
      r.fulfill({
        contentType: "text/html",
        body: '<meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/src/app/styles.css?direct"><div id="review"></div>',
      }),
    );
    await page.goto(`${origin}/__arena-variant`);
    for (const count of [2, 4, 6])
      for (const level of [1, 10, 20]) {
        const summary = await page.evaluate(
          async ({ path, count, level, size }) => {
            window.variantView?.dispose();
            const { renderArenaVariantReview } = await import(`/@fs${path}`);
            window.variantView = renderArenaVariantReview(
              document.getElementById("review"),
              count,
              level,
              size.width,
              size.height,
            );
            return window.variantView.summary();
          },
          {
            path: fileURLToPath(new URL("./arena-variant-review.ts", import.meta.url)),
            count,
            level,
            size: page.viewportSize(),
          },
        );
        samples.push({ mobile, ...summary });
        await page.screenshot({
          path: `${directory}/${mobile ? "phone" : "desktop"}-${count}-${summary.shape}.png`,
        });
      }
    await page.evaluate(() => window.variantView.dispose());
    await page.close();
  }
  assert.deepEqual(errors, []);
  await writeFile(
    `${directory}/report.json`,
    JSON.stringify(
      {
        kind: "Symmetrical frozen level variants through actual geometry, framing, reflections and briefing renderer",
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
