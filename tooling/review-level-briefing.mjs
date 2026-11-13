import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
const directory = "docs/reviews/m09/level-briefing",
  origin = process.argv[2] ?? "http://localhost:5177";
await mkdir(directory, { recursive: true });
const browser = await chromium.launch({ channel: "chromium" }),
  errors = [],
  samples = [];
try {
  for (const mobile of [false, true]) {
    const page = await browser.newPage({
      viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 900 },
      hasTouch: mobile,
      isMobile: mobile,
    });
    page.on("pageerror", (error) => errors.push(error.message));
    await page.route("**/__briefing", (route) =>
      route.fulfill({
        contentType: "text/html",
        body: '<meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/src/app/styles.css?direct"><div id="review"></div>',
      }),
    );
    await page.goto(`${origin}/__briefing`);
    for (const [count, level, lossLevel, demoted] of [
      [2, 1, 1, false],
      [4, 5, 5, false],
      [6, 8, 7, false],
      [4, 100, 99, false],
      [4, 7, 7, true],
    ]) {
      const sample = { mobile, count, level, lossLevel, demoted };
      const size = page.viewportSize();
      await page.evaluate(
        async ({ path, sample, size }) => {
          window.briefingView?.dispose();
          const { renderLevelIntroReview } = await import(`/@fs${path}`);
          window.briefingView = renderLevelIntroReview(
            document.getElementById("review"),
            sample.count,
            sample.level,
            sample.demoted,
            false,
            size.width,
            size.height,
            sample.lossLevel,
          );
          window.briefingView.advance(0.65);
        },
        { path: fileURLToPath(new URL("./level-intro-review.ts", import.meta.url)), sample, size },
      );
      await page.screenshot({
        path: `${directory}/${mobile ? "phone" : "desktop"}-${count}-level-${level}.png`,
      });
      samples.push(sample);
    }
    await page.evaluate(() => window.briefingView.dispose());
    await page.close();
  }
  const page = await browser.newPage();
  await page.goto(`${origin}/`);
  const curve = await page.evaluate(
    async ({ briefing, difficulty, bots }) => {
      const { levelHighlights } = await import(`/@fs${briefing}`);
      const { levelDifficulty } = await import(`/@fs${difficulty}`);
      const { botLevelProfile } = await import(`/@fs${bots}`);
      return Array.from({ length: 100 }, (_, i) => ({
        ...levelDifficulty(i + 1),
        highlights: levelHighlights(i + 1),
        bots: botLevelProfile(i + 1),
      }));
    },
    Object.fromEntries(
      [
        ["briefing", "../apps/web/src/session/level-briefing.ts"],
        ["difficulty", "../apps/web/src/simulation/difficulty.ts"],
        ["bots", "../apps/web/src/simulation/bot-level.ts"],
      ].map(([key, path]) => [key, fileURLToPath(new URL(path, import.meta.url))]),
    ),
  );
  assert.deepEqual(errors, []);
  await writeFile(
    `${directory}/report.json`,
    JSON.stringify(
      {
        kind: "Actual countdown lettering and reflections; authored preview poses",
        samples,
        errors,
        curve,
      },
      null,
      2,
    ) + "\n",
  );
  console.log({ samples: samples.length, errors });
} finally {
  await browser.close();
}
