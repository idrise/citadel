import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
const directory = "docs/reviews/m09/pickup",
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
    await page.route("**/__pickup", (r) =>
      r.fulfill({
        contentType: "text/html",
        body: '<meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/src/app/styles.css?direct"><div id="review"></div>',
      }),
    );
    await page.goto(`${origin}/__pickup`);
    for (const count of [2, 4, 6]) {
      await page.evaluate(
        async ({ path, count, size }) => {
          window.pickupView?.dispose();
          const { renderPickupReview } = await import(`/@fs${path}`);
          window.pickupView = renderPickupReview(
            document.getElementById("review"),
            count,
            size.width,
            size.height,
          );
        },
        {
          path: fileURLToPath(new URL("./pickup-review.ts", import.meta.url)),
          count,
          size: page.viewportSize(),
        },
      );
      for (const time of [0, 0.35, 0.95]) {
        const summary = await page.evaluate((time) => window.pickupView.frame(time), time);
        assert.equal(summary.collisionCaps, 0);
        if (time > 0) {
          assert.equal(summary.collections, 1);
          assert.equal(summary.health, 4);
        }
        samples.push({ mobile, ...summary });
        await page.screenshot({
          path: `${directory}/${mobile ? "phone" : "desktop"}-${count}-${time}.png`,
        });
      }
    }
    await page.evaluate(() => window.pickupView.dispose());
    await page.close();
  }
  assert.deepEqual(errors, []);
  await writeFile(
    `${directory}/report.json`,
    JSON.stringify(
      {
        kind: "Actual swept pickup impact, rebound, transfer and arrival through fixed-step play and real renderer",
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
