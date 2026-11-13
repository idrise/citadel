import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
const directory = "docs/reviews/m09/ready-charge",
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
    await page.route("**/__ready-charge", (r) =>
      r.fulfill({
        contentType: "text/html",
        body: '<meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/src/app/styles.css?direct"><div id="review"></div>',
      }),
    );
    await page.goto(`${origin}/__ready-charge`);
    for (const [count, seat, reduced] of [
      [2, 1, false],
      [4, 1, false],
      [6, 1, false],
      [4, 0, false],
      [4, 1, true],
    ]) {
      const summary = await page.evaluate(
        async ({ path, count, seat, reduced, size }) => {
          window.chargeView?.dispose();
          const { renderReadyChargeReview } = await import(`/@fs${path}`);
          window.chargeView = renderReadyChargeReview(
            document.getElementById("review"),
            count,
            seat,
            reduced,
            size.width,
            size.height,
          );
          return window.chargeView.summary();
        },
        {
          path: fileURLToPath(new URL("./ready-charge-review.ts", import.meta.url)),
          count,
          seat,
          reduced,
          size: page.viewportSize(),
        },
      );
      samples.push({ mobile, ...summary });
      await page.screenshot({
        path: `${directory}/${mobile ? "phone" : "desktop"}-${count}-${seat === 0 ? "human" : "rival"}${reduced ? "-reduced" : ""}.png`,
      });
      if (count === 4 && seat === 1 && !reduced) {
        await page.evaluate(() => window.chargeView.launch());
        await page.screenshot({
          path: `${directory}/${mobile ? "phone" : "desktop"}-4-launched.png`,
        });
      }
    }
    await page.evaluate(() => window.chargeView.dispose());
    await page.close();
  }
  assert.deepEqual(errors, []);
  await writeFile(
    `${directory}/report.json`,
    JSON.stringify(
      {
        kind: "Authored real held-ball poses and launch; actual energy/aim renderer",
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
