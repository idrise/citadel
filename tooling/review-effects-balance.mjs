import { execFileSync } from "node:child_process";
import { stripTypeScriptTypes } from "node:module";
import { chromium } from "@playwright/test";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
const origin = process.argv.find((arg) => arg.startsWith("http")) ?? "http://127.0.0.1:5181";
const directory = "docs/reviews/m09/effects-balance";
const before = process.argv.includes("--before");
const revision = "5ffd980";
await mkdir(directory, { recursive: true });
const browser = await chromium.launch({ channel: "chromium" });
const samples = [],
  errors = [];
try {
  const page = await browser.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  if (before)
    for (const module of ["tone-instruments", "tone-explosion"]) {
      const body = execFileSync("git", ["show", `${revision}:apps/web/src/audio/${module}.ts`], {
        encoding: "utf8",
      });
      await page.route(`**/${module}.ts*`, async (route) => {
        const response = await route.fetch();
        const compiled = await response.text();
        const tonePath = compiled.match(/import \* as Tone from "([^"]+)"/)[1];
        await route.fulfill({
          response,
          body: stripTypeScriptTypes(body).replace('"tone"', JSON.stringify(tonePath)),
        });
      });
    }
  await page.route("**/__mix-review", (r) =>
    r.fulfill({ contentType: "text/html", body: "<title>Citadel music mix</title>" }),
  );
  await page.goto(`${origin}/__mix-review`);
  for (const kind of [
    "wall",
    "paddle",
    "launch",
    "damage",
    "breach",
    "elimination",
    "collection",
    "supply",
    "victory",
    "swish",
    "music",
    "mixed",
    "stress",
    "stressMusic",
    "muted",
  ]) {
    const { wav, ...stats } = await page.evaluate(
      async ({ path, kind }) => {
        const { renderEffectsBalance } = await import(`/@fs${path}`);
        return renderEffectsBalance(kind);
      },
      { path: fileURLToPath(new URL("./effects-balance-preview.ts", import.meta.url)), kind },
    );
    console.log({ kind, peak: stats.peak, peakWindowRms: stats.peakWindowRms });
    assert(stats.peak < 0.99, `${kind}: output peak ${stats.peak} must not clip`);
    if (kind === "muted") assert(stats.peak < 0.000001);
    else assert(stats.peakWindowRms > 0.00001, `${kind}: cue must be audible`);
    if (kind === "mixed")
      await writeFile(
        `${directory}/${before ? "before" : "after"}.wav`,
        Buffer.from(wav, "base64"),
      );
    samples.push(stats);
  }
  if (!before) {
    const baseline = JSON.parse(await readFile(`${directory}/before.json`, "utf8"));
    for (const sample of samples) {
      const previous = baseline.samples.find((row) => row.kind === sample.kind);
      if (
        [
          "wall",
          "paddle",
          "launch",
          "damage",
          "breach",
          "collection",
          "supply",
          "victory",
          "swish",
        ].includes(sample.kind)
      ) {
        const change = 20 * Math.log10(sample.peakWindowRms / previous.peakWindowRms);
        assert(
          change > 4.5 && change < 5.5,
          `${sample.kind}: expected about 5dB stronger feedback`,
        );
      } else if (sample.kind === "music" || sample.kind === "elimination") {
        assert(
          Math.abs(20 * Math.log10(sample.peakWindowRms / previous.peakWindowRms)) < 0.5,
          `${sample.kind}: retain its existing level`,
        );
      }
    }
  }
  assert.deepEqual(errors, []);
  await writeFile(
    `${directory}/${before ? "before" : "after"}.json`,
    JSON.stringify({ samples, errors }, null, 2) + "\n",
  );
  console.log(samples);
} finally {
  await browser.close();
}
