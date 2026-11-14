import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
const origin = process.argv[2] ?? "http://127.0.0.1:5180",
  directory = "docs/reviews/m09/playtest-feedback";
await mkdir(directory, { recursive: true });
const browser = await chromium.launch({ channel: "chromium" }),
  errors = [],
  samples = [];
try {
  for (const mobile of [false, true]) {
    const size = mobile ? { width: 390, height: 844 } : { width: 1280, height: 900 },
      page = await browser.newPage({ viewport: size, isMobile: mobile, hasTouch: mobile });
    page.on("pageerror", (error) => errors.push(error.message));
    await page.route("**/__playtest", (route) =>
      route.fulfill({
        contentType: "text/html",
        body: '<meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/src/app/styles.css?direct"><div id="review"></div>',
      }),
    );
    await page.goto(`${origin}/__playtest`);
    const mount = async (count, level, seat = 0) =>
      page.evaluate(
        async (args) => {
          window.playtestReview?.dispose();
          const { createPlaytestFeedbackReview } = await import(`/@fs${args.path}`);
          window.playtestReview = createPlaytestFeedbackReview(
            document.getElementById("review"),
            args.count,
            args.level,
            args.size.width,
            args.size.height,
            args.seat,
          );
          return window.playtestReview.summary();
        },
        {
          path: fileURLToPath(new URL("./playtest-feedback-review.ts", import.meta.url)),
          count,
          level,
          seat,
          size,
        },
      );
    const capture = (name) =>
      page.screenshot({ path: `${directory}/${mobile ? "phone" : "desktop"}-${name}.png` });
    for (const count of [2, 4, 6])
      for (const level of [1, 6, 11]) {
        const summary = await mount(count, level);
        const idle = await page.evaluate(() => window.playtestReview.play());
        assert.equal(idle.collisionCaps, 0);
        assert.equal(idle.gameplayRngUnchanged, true);
        assert.ok(idle.movedBots > 0);
        samples.push({ mobile, ...summary, ...idle });
        await capture(`${count}-${summary.profile}`);
      }
    for (const offset of [-0.4, 0, 0.4]) {
      await mount(6, 1);
      await page.evaluate((offset) => window.playtestReview.play(offset), offset);
      await capture(`camera-${offset}`);
    }
    await mount(6, 6);
    await page.evaluate(() => window.playtestReview.briefing());
    await capture("profile-briefing");
    await page.evaluate(() => window.playtestReview.title());
    await capture("title-padding");
    for (const count of [2, 6, 16]) {
      await mount(count, 1, count - 1);
      for (const time of [0, 1.4, 3.4]) {
        await page.evaluate((time) => window.playtestReview.victory(time), time);
        await capture(`star-${count}-${time}`);
      }
      await page.evaluate(() => window.playtestReview.victory(0, true));
      await capture(`star-${count}-reduced`);
    }
    await page.evaluate(() => window.playtestReview.dispose());
    await page.close();
  }
  assert.deepEqual(errors, []);
  await writeFile(
    `${directory}/report.json`,
    JSON.stringify(
      {
        kind: "Authored idle and victory frames through ordinary renderer; no live-session outcomes claimed",
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
