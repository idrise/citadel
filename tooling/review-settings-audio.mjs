import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
const origin = process.argv[2] ?? "http://localhost:5177",
  directory = "docs/reviews/m09/scene-settings";
await mkdir(directory, { recursive: true });
const browser = await chromium.launch({ channel: "chromium" }),
  errors = [],
  samples = [];
try {
  const page = await browser.newPage();
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/__settings-audio", (route) =>
    route.fulfill({ contentType: "text/html", body: "<title>Mix audition</title>" }),
  );
  await page.goto(`${origin}/__settings-audio`);
  for (const [name, music, effects, source, audible] of [
    ["music-only", 0.45, 0, "music", true],
    ["effects-only", 0, 0.75, "effects", true],
    ["music-blocked", 0, 0.75, "music", false],
    ["effects-blocked", 0.45, 0, "effects", false],
    ["muted", 0, 0, "both", false],
  ]) {
    const { wav, ...metrics } = await page.evaluate(
      async ({ path, music, effects, source }) => {
        const { renderSettingsMix } = await import(`/@fs${path}`);
        return renderSettingsMix(music, effects, source);
      },
      {
        path: fileURLToPath(new URL("./settings-audio-review.ts", import.meta.url)),
        music,
        effects,
        source,
      },
    );
    await writeFile(`${directory}/${name}.wav`, Buffer.from(wav, "base64"));
    samples.push({ name, ...metrics });
    if (audible) assert(metrics.rms > 0.001);
    else assert(metrics.peak < 0.0001);
    assert(metrics.peak < 0.75);
  }
  assert.deepEqual(errors, []);
  await writeFile(
    `${directory}/audio-report.json`,
    JSON.stringify({ samples, errors }, null, 2) + "\n",
  );
  console.log({ samples, errors });
} finally {
  await browser.close();
}
