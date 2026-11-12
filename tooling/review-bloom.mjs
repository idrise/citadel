import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

const directory = process.argv[2] ?? "/tmp/citadel-bloom";
const origin = process.argv[3] ?? "http://127.0.0.1:5175";
await mkdir(directory, { recursive: true });
const browser = await chromium.launch({ channel: "chromium" });
const errors = [],
  reports = [];
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  page.on("pageerror", (error) => errors.push(error.stack));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.route("**/__bloom-review", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: '<style>body{margin:0;background:#080f1c}</style><div id="review"></div>',
    }),
  );
  await page.goto(`${origin}/__bloom-review`);
  const samples = await page.evaluate(
    async (path) => {
      const { reviewBloomExtraction } = await import(`/@fs${path}`);
      return { before: reviewBloomExtraction(true), after: reviewBloomExtraction() };
    },
    fileURLToPath(new URL("./bloom-review.ts", import.meta.url)),
  );
  for (const seat of samples.after) {
    // Test the compiled shader's actual HDR output, including hue preservation.
    seat.extracted.forEach((channel, index) =>
      assert.ok(Math.abs(channel - seat.input[index]) < 0.002, seat.seat),
    );
    assert.ok(
      seat.dim.every((channel) => channel === 0),
      `${seat.seat}: dark surfaces must stay excluded`,
    );
  }
  assert.ok(
    samples.before
      .find((seat) => seat.seat === "Violet")
      .extracted.every((channel) => channel === 0),
  );
  for (const count of [2, 4, 6])
    for (const mode of ["before", "after"]) {
      const result = await page.evaluate(
        async ({ path, count, mode }) => {
          const { renderEdgeReview } = await import(`/@fs${path}`);
          window.bloomReview = renderEdgeReview(
            document.getElementById("review"),
            count,
            undefined,
            false,
            false,
            mode === "before",
          );
          return { samples: window.bloomReview.samples };
        },
        { path: fileURLToPath(new URL("./edge-review.ts", import.meta.url)), count, mode },
      );
      await page.screenshot({ path: `${directory}/${count}-${mode}.png` });
      reports.push({ count, mode, ...result });
      await page.evaluate(() => window.bloomReview.dispose());
    }
  await writeFile(
    `${directory}/report.json`,
    JSON.stringify({ samples, reports, errors }, null, 2) + "\n",
  );
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ directory, reports, errors }));
} finally {
  await browser.close();
}
