import { chromium } from "@playwright/test";
import { fileURLToPath } from "node:url";
import { mkdir } from "node:fs/promises";
const origin = process.argv[2] ?? "http://127.0.0.1:5180",
  directory = "docs/reviews/m09/windows-feedback";
await mkdir(directory, { recursive: true });
const browser = await chromium.launch({ channel: "chromium" });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.route("**/__trails", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: '<link rel="stylesheet" href="/src/app/styles.css?direct"><div id="review"></div>',
    }),
  );
  await page.goto(`${origin}/__trails`);
  for (const [speed, spin] of [
    [14, 0],
    [34, 0],
    [59.5, 0],
    [34, 1],
  ]) {
    await page.evaluate(
      async ({ path, speed, spin }) => {
        window.trailReview?.dispose();
        const { createTrailReview } = await import(`/@fs${path}`);
        window.trailReview = createTrailReview(document.getElementById("review"), speed, spin);
      },
      { path: fileURLToPath(new URL("./trail-review.ts", import.meta.url)), speed, spin },
    );
    await page.screenshot({
      path: `${directory}/trail-${speed}-${spin === 0 ? "straight" : "curve"}.png`,
    });
  }
  await page.evaluate(() => window.trailReview.dispose());
} finally {
  await browser.close();
}
