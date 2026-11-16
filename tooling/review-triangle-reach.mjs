import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { installVirtualBrowserControls } from "../tests/virtual-input.ts";
const origin = process.argv[2] ?? "http://127.0.0.1:5192";
const directory = process.argv[3] ?? "docs/reviews/triangle-reach";
await mkdir(directory, { recursive: true });
const browser = await chromium.launch({ channel: "chromium" }),
  errors = [],
  poses = [];
try {
  for (const mobile of [false, true]) {
    const width = mobile ? 390 : 1280,
      height = mobile ? 844 : 900;
    const context = await browser.newContext({
      viewport: { width, height },
      hasTouch: mobile,
      isMobile: mobile,
    });
    const page = await context.newPage();
    await page.addInitScript(installVirtualBrowserControls);
    page.on("pageerror", (e) => errors.push(e.message));
    await page.route("**/__reach", (route) =>
      route.fulfill({
        contentType: "text/html",
        body: '<meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0}</style><div id="review"></div>',
      }),
    );
    await page.goto(`${origin}/__reach`);
    for (const count of mobile ? [3] : [2, 3, 4, 6])
      for (const before of count === 3 ? [true, false] : [false]) {
        const pose = await page.evaluate(
          async ({ path, count, before, width, height }) => {
            window.reach?.dispose();
            const { triangleReachReview } = await import(`/@fs${path}`);
            window.reach = triangleReachReview(
              document.getElementById("review"),
              count,
              before,
              width,
              height,
            );
            return window.reach.summary();
          },
          {
            path: fileURLToPath(new URL("./triangle-reach-review.ts", import.meta.url)),
            count,
            before,
            width,
            height,
          },
        );
        poses.push({ mobile, ...pose });
        for (const side of count === 3 ? [-1, 0, 1] : [1]) {
          await page.evaluate((side) => window.reach.render(side), side);
          await page.screenshot({
            path: `${directory}/${mobile ? "phone" : "desktop"}-${count}-${before ? "before" : "after"}-${side}.png`,
          });
        }
      }
    await page.evaluate(() => window.reach.dispose());
    await context.close();
  }
  await writeFile(
    `${directory}/poses.json`,
    JSON.stringify(
      {
        kind: "Authored poses, not natural match outcomes; real four-to-three morph",
        poses,
        errors,
      },
      null,
      2,
    ) + "\n",
  );
  if (errors.length) throw new Error(errors.join("\n"));
  console.log(JSON.stringify({ directory, poses, errors }));
} finally {
  await browser.close();
}
