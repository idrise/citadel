import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
const directory = "docs/reviews/m09/elimination",
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
    await page.route("**/__elimination", (route) =>
      route.fulfill({
        contentType: "text/html",
        body: '<meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/src/app/styles.css?direct"><div id="review"></div>',
      }),
    );
    await page.goto(`${origin}/__elimination`);
    for (const [count, playerKill, reduced] of [
      [2, true, false],
      [4, true, false],
      [6, true, false],
      [4, false, false],
      [4, true, true],
    ]) {
      const summary = await page.evaluate(
        async ({ path, count, playerKill, reduced, size }) => {
          window.eliminationView?.dispose();
          const { renderEliminationReview } = await import(`/@fs${path}`);
          window.eliminationView = renderEliminationReview(
            document.getElementById("review"),
            count,
            playerKill,
            reduced,
            size.width,
            size.height,
          );
          window.eliminationView.advance(0.35);
          return window.eliminationView.summary();
        },
        {
          path: fileURLToPath(new URL("./elimination-review.ts", import.meta.url)),
          count,
          playerKill,
          reduced,
          size: page.viewportSize(),
        },
      );
      assert.equal(summary.collisionCaps, 0);
      samples.push({ mobile, ...summary });
      await page.screenshot({
        path: `${directory}/${mobile ? "phone" : "desktop"}-${count}-${playerKill ? "player" : "bot"}${reduced ? "-reduced" : ""}.png`,
      });
    }
    await page.evaluate(() => window.eliminationView.dispose());
    await page.close();
  }
  const page = await browser.newPage();
  await page.goto(`${origin}/`);
  const audio = [];
  for (const own of [false, true]) {
    const { wav, ...stats } = await page.evaluate(
      async ({ path, own }) => {
        const { renderEliminationSound } = await import(`/@fs${path}`);
        return renderEliminationSound(own);
      },
      { path: fileURLToPath(new URL("./elimination-review.ts", import.meta.url)), own },
    );
    assert.ok(stats.rms > 0.002);
    assert.ok(stats.peak < 0.99);
    await writeFile(
      `${directory}/${own ? "player-loss" : "rival-eliminated"}.wav`,
      Buffer.from(wav, "base64"),
    );
    audio.push({ own, ...stats });
  }
  assert.deepEqual(errors, []);
  await writeFile(
    `${directory}/report.json`,
    JSON.stringify(
      {
        kind: "Authored real last-container damage and event attribution, procedural audio",
        samples,
        audio,
        errors,
      },
      null,
      2,
    ) + "\n",
  );
  console.log({ samples: samples.length, audio, errors });
} finally {
  await browser.close();
}
