import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { installVirtualBrowserControls } from "../tests/virtual-input.ts";

const origin = process.argv[2] ?? "http://127.0.0.1:5193";
const directory = process.argv[3] ?? "artifacts/reviews/wall-escape";
await mkdir(directory, { recursive: true });
const browser = await chromium.launch({ channel: "chromium" });
const errors = [],
  reports = [];
try {
  for (const mobile of [false, true]) {
    const page = await browser.newPage({
      viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 850 },
      deviceScaleFactor: 1,
      isMobile: mobile,
      hasTouch: mobile,
    });
    await page.addInitScript(installVirtualBrowserControls);
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(`${origin}/wall-escape.html`);
    await page.waitForFunction(() => Boolean(window.wallEscapeReview));
    const report = await page.evaluate(() => {
      window.wallEscapeReview.seek(20);
      return window.wallEscapeReview.summary();
    });
    if (
      report.before.firstContact !== null ||
      report.after.firstContact === null ||
      report.after.firstContact >= 12
    )
      throw Error("Wall escape comparison did not reproduce");
    if (report.before.collisionCaps || report.after.collisionCaps)
      throw Error("Collision cap in review");
    reports.push({ mobile, ...report });
    await page.screenshot({
      path: `${directory}/${mobile ? "phone" : "desktop"}.png`,
      fullPage: true,
    });
    await page.close();
  }
  await writeFile(
    `${directory}/comparison.json`,
    JSON.stringify({ reports, errors }, null, 2) + "\n",
  );
  if (errors.length) throw Error(errors.join("\n"));
  console.log(JSON.stringify({ directory, reports, errors }));
} finally {
  await browser.close();
}
