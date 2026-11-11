import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
const directory = process.argv[2] ?? "/tmp/citadel-edges",
  origin = process.argv[3] ?? "http://127.0.0.1:5173";
await mkdir(directory, { recursive: true });
const source = execFileSync(
  "git",
  ["show", "b2b2358:apps/web/src/rendering/feature-edge-shader.ts"],
  { encoding: "utf8" },
);
const legacy = {
  vertex: source.match(/edgeVertexShader = `([\s\S]*?)`;/)[1],
  fragment: source.match(/edgeFragmentShader = `([\s\S]*?)`;/)[1],
};
const modulePath = fileURLToPath(new URL("./edge-review.ts", import.meta.url));
const browser = await chromium.launch({ channel: "chromium" }),
  errors = [],
  images = [];
try {
  for (const count of [2, 4, 6])
    for (const mode of count === 6
      ? ["before", "after", "reduced", "dense"]
      : ["before", "after", "reduced"]) {
      const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
      page.on("pageerror", (error) => errors.push({ count, mode, error: error.stack }));
      await page.route("**/__edge-review", (route) =>
        route.fulfill({
          contentType: "text/html",
          body: '<style>body{margin:0;background:#080f1c}</style><div id="review"></div>',
        }),
      );
      await page.goto(`${origin}/__edge-review`);
      const samples = await page.evaluate(
        async ({ path, count, legacy, mode }) => {
          const { renderEdgeReview } = await import(`/@fs${path}`);
          window.edgeReview = renderEdgeReview(
            document.getElementById("review"),
            count,
            mode === "before" ? legacy : undefined,
            mode === "reduced",
            mode === "dense",
          );
          return window.edgeReview.samples;
        },
        { path: modulePath, count, legacy, mode },
      );
      await page.screenshot({ path: `${directory}/${count}-${mode}.png` });
      images.push({ count, mode, samples });
      await page.evaluate(() => window.edgeReview.dispose());
      await page.close();
    }
  await writeFile(
    `${directory}/render-stats.json`,
    JSON.stringify(
      {
        baseline:
          "b2b2358 edge shader and unsampled bloom composer; identical frozen arena/exposure",
        images,
        errors,
      },
      null,
      2,
    ) + "\n",
  );
  if (errors.length) throw Error("Edge render review has page errors");
  console.log(JSON.stringify({ directory, images, errors }));
} finally {
  await browser.close();
}
