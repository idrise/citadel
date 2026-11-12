import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
const directory = process.argv[2] ?? "/tmp/citadel-impacts",
  origin = process.argv[3] ?? "http://127.0.0.1:5176";
await mkdir(directory, { recursive: true });
const browser = await chromium.launch({ channel: "chromium" }),
  errors = [],
  samples = [];
try {
  const page = await browser.newPage();
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/__impact-audio", (route) =>
    route.fulfill({ contentType: "text/html", body: "<body></body>" }),
  );
  await page.goto(`${origin}/__impact-audio`);
  for (const [kind, legacy] of [
    ["wall", true],
    ["wall", false],
    ["paddle", true],
    ["paddle", false],
    ["rally", false],
  ]) {
    const { wav, ...stats } = await page.evaluate(
      async ({ path, kind, legacy }) => {
        const { renderImpactAudio } = await import(`/@fs${path}`);
        return renderImpactAudio(kind, legacy);
      },
      { path: fileURLToPath(new URL("./impact-audio-preview.ts", import.meta.url)), kind, legacy },
    );
    await writeFile(
      `${directory}/${kind}-${legacy ? "before" : "after"}.wav`,
      Buffer.from(wav, "base64"),
    );
    assert.ok(
      stats.peak > (legacy ? 0.00001 : 0.02) && stats.peak < 0.99,
      "new auditions must be audible and all clips unclipped",
    );
    samples.push(stats);
  }
  for (const kind of ["wall", "paddle"]) {
    const before = samples.find((s) => s.kind === kind && s.legacy),
      after = samples.find((s) => s.kind === kind && !s.legacy);
    assert.ok(after.rms > before.rms * 1.5, `${kind} must be louder at the same master volume`);
  }
  assert.deepEqual(errors, []);
  await writeFile(`${directory}/report.json`, JSON.stringify({ samples, errors }, null, 2) + "\n");
  console.log(JSON.stringify({ samples, errors }));
} finally {
  await browser.close();
}
