import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
const directory = "docs/reviews/m09/spin-bounce",
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
    await page.route("**/__spin-bounce", (r) =>
      r.fulfill({
        contentType: "text/html",
        body: '<meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/src/app/styles.css?direct"><div id="review"></div>',
      }),
    );
    await page.goto(`${origin}/__spin-bounce`);
    for (const count of [2, 4, 6])
      for (const side of [-1, 0, 1]) {
        const summary = await page.evaluate(
          async ({ path, count, side, size }) => {
            window.spinView?.dispose();
            const { renderSpinBounceReview } = await import(`/@fs${path}`);
            window.spinView = renderSpinBounceReview(
              document.getElementById("review"),
              count,
              side,
              size.width,
              size.height,
            );
            return window.spinView.summary();
          },
          {
            path: fileURLToPath(new URL("./spin-bounce-review.ts", import.meta.url)),
            count,
            side,
            size: page.viewportSize(),
          },
        );
        samples.push({ mobile, ...summary });
        await page.screenshot({
          path: `${directory}/${mobile ? "phone" : "desktop"}-${count}-${side}.png`,
        });
      }
    await page.evaluate(() => window.spinView.dispose());
    await page.close();
  }
  assert.deepEqual(errors, []);
  await writeFile(
    `${directory}/report.json`,
    JSON.stringify(
      {
        kind: "Actual incoming spin, physical paddle bounce and shared return forecast",
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
