import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
const origin = process.argv[2] ?? "http://localhost:5177",
  directory = "docs/reviews/m09/bot-serving";
await mkdir(directory, { recursive: true });
const browser = await chromium.launch({ channel: "chromium" }),
  samples = [],
  duels = [],
  errors = [];
try {
  for (const mobile of [false, true]) {
    const page = await browser.newPage({
      viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 900 },
      hasTouch: mobile,
      isMobile: mobile,
    });
    page.on("pageerror", (e) => errors.push(e.message));
    await page.route("**/__serving", (route) =>
      route.fulfill({
        contentType: "text/html",
        body: '<meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/src/app/styles.css?direct"><div id="review"></div>',
      }),
    );
    await page.goto(`${origin}/__serving`);
    for (const [count, side] of [
      ...[2, 4, 6].flatMap((count) => [-1, 1].map((side) => [count, side])),
      [4, 0],
      [16, 1],
    ]) {
      await page.evaluate(
        async ({ path, count, side, size }) => {
          window.serveView?.dispose();
          const { createServeCurveReview } = await import(`/@fs${path}`);
          window.serveView = createServeCurveReview(
            document.getElementById("review"),
            count,
            side,
            size.width,
            size.height,
          );
        },
        {
          path: fileURLToPath(new URL("./serve-curve-review.ts", import.meta.url)),
          count,
          side,
          size: page.viewportSize(),
        },
      );
      await page.screenshot({
        path: `${directory}/${mobile ? "phone" : "desktop"}-${count}-${side}-held.png`,
      });
      const sample = await page.evaluate(() => window.serveView.launch());
      assert.equal(Math.sign(sample.initialSpin), side);
      assert.equal(sample.collisionCaps, 0);
      samples.push({ mobile, ...sample });
      await page.screenshot({
        path: `${directory}/${mobile ? "phone" : "desktop"}-${count}-${side}-launched.png`,
      });
    }
    await page.evaluate(
      async ({ path, size }) => {
        window.serveView?.dispose();
        const { createBotServeReview } = await import(`/@fs${path}`);
        window.serveView = createBotServeReview(
          document.getElementById("review"),
          size.width,
          size.height,
        );
      },
      {
        path: fileURLToPath(new URL("./serve-curve-review.ts", import.meta.url)),
        size: page.viewportSize(),
      },
    );
    for (const [time, turnAway, name] of [
      [0.2, false, "covered"],
      [0.35, true, "opening"],
      [0.9, true, "scored"],
    ]) {
      const sample = await page.evaluate(
        ({ time, turnAway }) => window.serveView.frame(time, turnAway),
        { time, turnAway },
      );
      duels.push({ mobile, time, ...sample });
      if (!turnAway) assert.equal(sample.launches.length, 0);
      if (name === "scored") {
        assert.equal(sample.health[0], 2);
        assert.equal(sample.collisionCaps, 0);
      }
      await page.screenshot({
        path: `${directory}/${mobile ? "phone" : "desktop"}-bot-${name}.png`,
      });
    }
    await page.evaluate(() => window.serveView.dispose());
    await page.close();
  }
  assert.deepEqual(errors, []);
  await writeFile(
    `${directory}/report.json`,
    JSON.stringify(
      {
        kind: "Authored swipe-ready launch poses and actual exposed-bank bot duel; ordinary simulation and renderer",
        samples,
        duels,
        errors,
      },
      null,
      2,
    ) + "\n",
  );
  console.log({ samples: samples.length, duels: duels.length, errors });
} finally {
  await browser.close();
}
