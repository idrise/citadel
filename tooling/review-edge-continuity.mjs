import { chromium } from "@playwright/test";
import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
const browser = await chromium.launch({ channel: "chromium" });
try {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await page.route("**/__edge-review", (route) =>
    route.fulfill({ contentType: "text/html", body: "<title>Edge continuity review</title>" }),
  );
  await page.goto("http://127.0.0.1:5177/__edge-review");
  const { samples, legacy } = await page.evaluate(
    async (path) => {
      const { reviewEdgeContinuity } = await import(`/@fs${path}`);
      return { samples: reviewEdgeContinuity(), legacy: reviewEdgeContinuity(true) };
    },
    fileURLToPath(new URL("../apps/web/src/dev/edge-continuity-review.ts", import.meta.url)),
  );
  console.log(JSON.stringify({ samples, legacy, errors }));
  await writeFile(
    "docs/reviews/morph-studio/edge-continuity.json",
    JSON.stringify({ samples, legacy, errors }, null, 2) + "\n",
  );
  if (process.argv.includes("--assert")) {
    const { default: assert } = await import("node:assert/strict");
    assert.deepEqual(errors, []);
    for (const sample of samples) {
      assert.equal(sample.reference.visible, 100);
      assert.equal(sample.depthTested.visible, 100);
      assert.equal(sample.depthTested.coverage, sample.reference.coverage);
      assert(sample.occluded.visible < 90);
      assert(sample.occluded.coverage < sample.reference.coverage * 0.9);
    }
  }
} finally {
  await browser.close();
}
