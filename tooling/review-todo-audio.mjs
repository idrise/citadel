import { chromium } from "@playwright/test";
import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
const origin = process.argv[2] ?? "http://localhost:5177",
  directory = "docs/reviews/m09/mobile-todos";
const browser = await chromium.launch({ channel: "chromium" });
try {
  const page = await browser.newPage();
  page.on("pageerror", (e) => console.error(e.stack));
  await page.route("**/__audio-review", (r) =>
    r.fulfill({ contentType: "text/html", body: "<body></body>" }),
  );
  await page.goto(`${origin}/__audio-review`);
  const report = [];
  for (const { name, module, method, options } of [
    {
      name: "soundtrack",
      module: "music-preview.ts",
      method: "renderMusicPreview",
      options: { duration: 32, hits: false, balls: 4, startStep: 128 },
    },
    { name: "paddle-swish", module: "swish-preview.ts", method: "renderSwishPreview", options: {} },
  ]) {
    console.log("Rendering", name);
    const { wav, ...stats } = await page.evaluate(
      async ({ path, method, options }) => (await import(`/@fs${path}`))[method](options),
      { path: fileURLToPath(new URL(`./${module}`, import.meta.url)), method, options },
    );
    await writeFile(`${directory}/${name}.wav`, Buffer.from(wav, "base64"));
    report.push({ name, ...stats });
  }
  await writeFile(`${directory}/audio-report.json`, JSON.stringify(report, null, 2) + "\n");
  console.log(report);
} finally {
  await browser.close();
}
