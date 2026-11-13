import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
const directory = "docs/reviews/m09/scene-settings",
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
    await page.route("**/__scene-settings", (r) =>
      r.fulfill({
        contentType: "text/html",
        body: '<meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/src/app/styles.css?direct"><div id="review"></div>',
      }),
    );
    await page.goto(`${origin}/__scene-settings`);
    for (const count of [2, 4, 6]) {
      const summary = await page.evaluate(
        async ({ path, count, size }) => {
          window.settingsView?.dispose();
          const { renderSceneSettingsReview } = await import(`/@fs${path}`);
          window.settingsView = renderSceneSettingsReview(
            document.getElementById("review"),
            count,
            size.width,
            size.height,
          );
          return window.settingsView.summary();
        },
        {
          path: fileURLToPath(new URL("./scene-settings-review.ts", import.meta.url)),
          count,
          size: page.viewportSize(),
        },
      );
      samples.push({ mobile, ...summary });
      await page.screenshot({
        path: `${directory}/${mobile ? "phone" : "desktop"}-${count}.png`,
      });
    }
    await page.evaluate(() => window.settingsView.dispose());
    await page.close();
  }
  assert.deepEqual(errors, []);
  await writeFile(
    `${directory}/report.json`,
    JSON.stringify(
      {
        kind: "Actual scene settings, fixed desktop/phone layout, backdrop in 2/4/6 arenas",
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
