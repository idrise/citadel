import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

const directory = process.argv[2] ?? "/tmp/citadel-paddle-blur";
const origin = process.argv[3] ?? "http://127.0.0.1:5176";
await mkdir(directory, { recursive: true });
const browser = await chromium.launch({ channel: "chromium" });
const errors = [];
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.route("**/__paddle-review", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: '<style>body{margin:0;background:#080f1c}</style><div id="review"></div>',
    }),
  );
  await page.goto(`${origin}/__paddle-review`);
  for (const count of [2, 4, 6])
    for (const mode of ["before", "after"]) {
      await page.evaluate(
        async ({ path, count, mode }) => {
          const { renderEdgeReview } = await import(`/@fs${path}`);
          window.paddleReview = renderEdgeReview(
            document.getElementById("review"),
            count,
            undefined,
            false,
            false,
            false,
            mode,
          );
        },
        { path: fileURLToPath(new URL("./edge-review.ts", import.meta.url)), count, mode },
      );
      await page.screenshot({ path: `${directory}/${count}-${mode}.png` });
      await page.evaluate(() => window.paddleReview.dispose());
    }
  assert.deepEqual(errors, []);
  await writeFile(
    `${directory}/report.json`,
    JSON.stringify({ counts: [2, 4, 6], modes: ["before", "after"], errors }, null, 2) + "\n",
  );
  console.log(JSON.stringify({ directory, errors }));
} finally {
  await browser.close();
}
