import { chromium } from "@playwright/test";
import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
const origin = process.argv[2] ?? "http://localhost:5177",
  directory = "docs/reviews/music/motif-return";
const browser = await chromium.launch({ channel: "chromium" });
try {
  const page = await browser.newPage(),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route("**/__motif-return", (r) =>
    r.fulfill({ contentType: "text/html", body: "<body></body>" }),
  );
  await page.goto(`${origin}/__motif-return`);
  const reports = [];
  for (const sample of [
    { name: "one-ball-home-and-departure", duration: 16, balls: 1, startStep: 64 },
    { name: "layered-drop-and-return", duration: 20, balls: 3, startStep: 256 },
  ]) {
    const { wav, ...stats } = await page.evaluate(
      async ({ path, sample }) => {
        const { renderMusicPreview } = await import(`/@fs${path}`);
        return renderMusicPreview({ ...sample, hits: false });
      },
      { path: fileURLToPath(new URL("./music-preview.ts", import.meta.url)), sample },
    );
    assert.ok(stats.rms > 0.002);
    assert.ok(stats.peak < 0.99);
    await writeFile(`${directory}/${sample.name}.wav`, Buffer.from(wav, "base64"));
    reports.push({ ...sample, ...stats });
  }
  assert.deepEqual(errors, []);
  await writeFile(
    `${directory}/audio-report.json`,
    JSON.stringify({ reports, errors }, null, 2) + "\n",
  );
  console.log({ reports, errors });
} finally {
  await browser.close();
}
