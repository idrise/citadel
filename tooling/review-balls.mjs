import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
const directory = process.argv[2] ?? "/tmp/citadel-balls",
  origin = process.argv[3] ?? "http://127.0.0.1:5176";
await mkdir(directory, { recursive: true });
const browser = await chromium.launch({ channel: "chromium" }),
  errors = [];
try {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    recordVideo: { dir: directory, size: { width: 1280, height: 900 } },
  });
  const page = await context.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await page.route("**/__ball-review", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: '<style>body{margin:0;background:#080f1c}</style><div id="review"></div>',
    }),
  );
  await page.goto(`${origin}/__ball-review`);
  const mount = async (
    count,
    close = false,
    reduced = false,
    dense = false,
    width = 1280,
    height = 900,
  ) => {
    await page.setViewportSize({ width, height });
    await page.evaluate(
      async ({ path, count, close, reduced, dense, width, height }) => {
        const { renderEdgeReview } = await import(`/@fs${path}`);
        window.ballReview?.dispose();
        window.ballReview = renderEdgeReview(
          document.getElementById("review"),
          count,
          undefined,
          reduced,
          dense,
          false,
          "none",
          { close, width, height },
        );
      },
      {
        path: fileURLToPath(new URL("./edge-review.ts", import.meta.url)),
        count,
        close,
        reduced,
        dense,
        width,
        height,
      },
    );
  };
  for (const count of [2, 4, 6]) {
    await mount(count);
    await page.screenshot({ path: `${directory}/arena-${count}.png` });
  }
  await mount(6, false, false, true);
  await page.screenshot({ path: `${directory}/eight-balls.png` });
  await mount(4, true);
  await page.screenshot({ path: `${directory}/spin-close.png` });
  await page.evaluate(async () => {
    for (let i = 0; i < 120; i++) {
      window.ballReview.advanceBallReview(2);
      await new Promise((resolve) => setTimeout(resolve, 1000 / 60));
    }
  });
  await page.screenshot({ path: `${directory}/spin-close-later.png` });
  await mount(4, true, true);
  await page.screenshot({ path: `${directory}/reduced.png` });
  await mount(6, false, false, true, 390, 844);
  await page.screenshot({ path: `${directory}/mobile-eight.png` });
  await page.evaluate(() => window.ballReview.dispose());
  await page.close();
  await context.close();
  assert.deepEqual(errors, []);
  await writeFile(
    `${directory}/report.json`,
    JSON.stringify(
      {
        kind: "Actual rendering in fixed spin fixtures; three balls are zero / positive / negative spin",
        counts: [2, 4, 6],
        errors,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(JSON.stringify({ directory, errors }));
} finally {
  await browser.close();
}
