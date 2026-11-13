import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
const directory = "docs/reviews/m09/scene-retry-gap",
  origin = process.argv[2] ?? "http://localhost:5177";
await mkdir(directory, { recursive: true });
const browser = await chromium.launch({ channel: "chromium" });
try {
  const errors = [],
    samples = [];
  for (const mobile of [false, true]) {
    const context = await browser.newContext({
      viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 900 },
      hasTouch: mobile,
      isMobile: mobile,
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();
    page.on("pageerror", (e) => errors.push(e.stack));
    await page.route("**/__retry-gap", (r) =>
      r.fulfill({
        contentType: "text/html",
        body: '<meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/src/app/styles.css?direct"><div id="review"></div>',
      }),
    );
    await page.goto(`${origin}/__retry-gap`);
    for (const [count, mode] of [
      [2, "gap"],
      [3, "previous"],
      [3, "gap"],
      [4, "spectator"],
      [6, "spectator"],
    ]) {
      const size = page.viewportSize();
      samples.push(
        await page.evaluate(
          async ({ path, count, mode, size }) => {
            window.gapView?.dispose();
            const { renderRetryGapReview } = await import(`/@fs${path}`);
            window.gapView = renderRetryGapReview(
              document.getElementById("review"),
              count,
              mode,
              size.width,
              size.height,
            );
            return window.gapView.summary();
          },
          {
            path: fileURLToPath(new URL("./retry-gap-review.ts", import.meta.url)),
            count,
            mode,
            size,
          },
        ),
      );
      await page.screenshot({
        path: `${directory}/${mobile ? "phone" : "desktop"}-${count}-${mode}.png`,
      });
      if (mode === "spectator") {
        const retry = page.getByRole("button", { name: "Retry level 5", exact: true });
        assert.equal(await retry.evaluate((e) => getComputedStyle(e).opacity), "0");
        assert.equal(await page.locator(".elimination-actions").count(), 0);
      }
    }
    await page.evaluate(() => window.gapView.dispose());
    await context.close();
  }
  assert.deepEqual(errors, []);
  await writeFile(
    `${directory}/report.json`,
    JSON.stringify(
      {
        kind: "Authored previous/current triangle poses and scene spectator controls",
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
