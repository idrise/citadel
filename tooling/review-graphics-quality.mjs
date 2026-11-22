import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { installVirtualBrowserControls } from "../tests/virtual-input.ts";
const origin = process.argv[2] ?? "http://127.0.0.1:5181";
const directory = "artifacts/reviews/m09/graphics-quality";
await mkdir(directory, { recursive: true });
const browser = await chromium.launch({ channel: "chromium" });
const samples = [],
  errors = [];
try {
  for (const { name, width, height, touch } of [
    { name: "desktop", width: 1280, height: 900, touch: false },
    { name: "phone", width: 390, height: 844, touch: true },
    { name: "tablet", width: 768, height: 1024, touch: true },
    { name: "landscape", width: 568, height: 320, touch: true },
  ]) {
    const page = await browser.newPage({
      viewport: { width, height },
      hasTouch: touch,
      isMobile: touch,
      deviceScaleFactor: 2,
    });
    page.on("pageerror", (e) => errors.push(e.message));
    await page.addInitScript(installVirtualBrowserControls);
    await page.route("**/__quality-review", (r) =>
      r.fulfill({
        contentType: "text/html",
        body: '<meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/src/app/styles.css?direct"><style>html,body{margin:0;overflow:hidden}</style><div id="review"></div>',
      }),
    );
    await page.goto(`${origin}/__quality-review`);
    for (const count of name === "desktop" ? [2, 4, 6] : [6]) {
      await page.evaluate(
        async ({ path, count, touch }) => {
          window.qualityReview?.dispose();
          const { createGraphicsQualityReview } = await import(`/@fs${path}`);
          window.qualityReview = createGraphicsQualityReview(
            document.getElementById("review"),
            count,
            touch,
          );
        },
        {
          path: fileURLToPath(new URL("./graphics-quality-review.ts", import.meta.url)),
          count,
          touch,
        },
      );
      for (const quality of ["low", "medium", "high"]) {
        const sample = await page.evaluate(
          ({ quality }) => {
            window.qualityReview.render(quality, false);
            return window.qualityReview.render(quality, false);
          },
          { quality },
        );
        assert.equal(sample.effects.bloom, quality !== "low");
        assert.equal(sample.effects.reflections, quality === "high");
        assert.equal(sample.effects.environment, quality === "high");
        samples.push({ name, touch, ...sample });
        if (name !== "landscape")
          await page.screenshot({
            path: `${directory}/${name}-${count}-${quality}.png`,
            scale: "css",
          });
      }
      await page.evaluate(() => window.qualityReview.render("high", true));
      await page.screenshot({ path: `${directory}/${name}-${count}-settings.png`, scale: "css" });
    }
    await page.evaluate(() => window.qualityReview.dispose());
    await page.close();
  }
  assert.deepEqual(errors, []);
  for (const name of ["desktop", "phone", "tablet"]) {
    const selected = samples.filter((s) => s.name === name && s.count === 6);
    assert(selected[0].calls < selected[1].calls);
    assert(selected[1].calls < selected[2].calls);
  }
  await writeFile(
    `${directory}/report.json`,
    JSON.stringify(
      {
        kind: "Matched static boards at DPR 2; mobile is emulation on the host GPU",
        samples,
        errors,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(
    samples.map((s) => ({
      device: s.name,
      count: s.count,
      quality: s.quality,
      calls: s.calls,
      buffer: s.drawingBuffer,
    })),
  );
} finally {
  await browser.close();
}
