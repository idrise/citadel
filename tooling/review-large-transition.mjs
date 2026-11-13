import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
const directory = "docs/reviews/m09/roster-variety/transitions",
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
    await page.route("**/__board-transition", (r) =>
      r.fulfill({
        contentType: "text/html",
        body: '<meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/src/app/styles.css?direct"><div id="review"></div>',
      }),
    );
    await page.goto(`${origin}/__board-transition`);
    for (const count of [16]) {
      await page.evaluate(
        async ({ path, count, size }) => {
          window.transitionView?.dispose();
          const { renderBoardTransitionReview } = await import(`/@fs${path}`);
          window.transitionView = renderBoardTransitionReview(
            document.getElementById("review"),
            count,
            size.width,
            size.height,
            true,
          );
        },
        {
          path: fileURLToPath(new URL("./board-transition-review.ts", import.meta.url)),
          count,
          size: page.viewportSize(),
        },
      );
      for (const time of [0, 0.7, 1.4]) {
        const summary = await page.evaluate((time) => window.transitionView.frame(time), time);
        assert.equal(summary.sameCanvas, true);
        assert.equal(summary.moving, time < 1.4);
        samples.push({ mobile, ...summary });
        await page.screenshot({
          path: `${directory}/${mobile ? "phone" : "desktop"}-${count}-${time}.png`,
        });
      }
    }
    await page.evaluate(() => window.transitionView.dispose());
    await page.close();
  }
  assert.deepEqual(errors, []);
  await writeFile(
    `${directory}/report.json`,
    JSON.stringify(
      {
        kind: "Authored completed match through real viewport capture, constant canvas, star to next board",
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
