import { execFileSync } from "node:child_process";
import { stripTypeScriptTypes } from "node:module";
import { chromium } from "@playwright/test";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
const origin = process.argv.find((arg) => arg.startsWith("http")) ?? "http://127.0.0.1:5181";
const whoosh = process.argv.includes("--whoosh");
const glideSwish = process.argv.includes("--glide-swish");
const airSwish = process.argv.includes("--air-swish");
const strokeReview = whoosh || glideSwish;
const textureReview = strokeReview || airSwish;
const swishReview = textureReview || process.argv.includes("--swish");
const directory = `artifacts/reviews/m09/${whoosh ? "bat-whoosh" : glideSwish ? "bat-glide" : airSwish ? "bat-air" : swishReview ? "bat-swish" : "effects-balance"}`;
const before = process.argv.includes("--before");
const revision = whoosh
  ? "b00feae"
  : glideSwish
    ? "57974aa"
    : airSwish
      ? "98d5735"
      : swishReview
        ? "42aa1c3"
        : "5ffd980";
await mkdir(directory, { recursive: true });
const browser = await chromium.launch({ channel: "chromium" });
const samples = [],
  errors = [];
try {
  const page = await browser.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  if (before)
    for (const module of textureReview
      ? ["paddle-swish", "tone-swish"]
      : swishReview
        ? ["paddle-swish"]
        : ["tone-instruments", "tone-explosion", "paddle-swish"]) {
      const body = execFileSync("git", ["show", `${revision}:apps/web/src/audio/${module}.ts`], {
        encoding: "utf8",
      });
      await page.route(`**/${module}*`, async (route) => {
        const response = await route.fetch();
        const compiled = await response.text();
        const tonePath = compiled.match(/import \* as Tone from "([^"]+)"/)?.[1];
        await route.fulfill({
          response,
          body: tonePath
            ? stripTypeScriptTypes(body).replace('"tone"', JSON.stringify(tonePath))
            : stripTypeScriptTypes(body),
        });
      });
    }
  await page.route("**/__mix-review", (r) =>
    r.fulfill({ contentType: "text/html", body: "<title>Citadel music mix</title>" }),
  );
  await page.goto(`${origin}/__mix-review`);
  for (const kind of strokeReview
    ? ["swishRest", "swishSlow", "swish", "swishFast", "swishGesture", "swishGameMix", "swishMuted"]
    : airSwish
      ? ["swishRest", "swishSlow", "swish", "swishFast", "swishGesture", "swishMusic", "swishMuted"]
      : swishReview
        ? ["swishSlow", "swish", "swishFast", "swishMusic", "swishMuted"]
        : [
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
    if (
      kind === "muted" ||
      kind === "swishMuted" ||
      kind === "swishRest" ||
      ((whoosh || (strokeReview && !before)) && kind === "swishSlow")
    )
      assert(stats.peak < 0.000001);
    else assert(stats.peakWindowRms > 0.00001, `${kind}: cue must be audible`);
    if (kind === "mixed" || kind === "swishMusic" || kind === "swishGameMix")
      await writeFile(
        `${directory}/${before ? "before" : "after"}.wav`,
        Buffer.from(wav, "base64"),
      );
    if (textureReview && kind === "swishGesture")
      await writeFile(
        `${directory}/${before ? "before" : "after"}-${kind}.wav`,
        Buffer.from(wav, "base64"),
      );
    samples.push(stats);
  }
  if (!before) {
    const baseline = JSON.parse(await readFile(`${directory}/before.json`, "utf8"));
    for (const sample of samples) {
      const previous = baseline.samples.find((row) => row.kind === sample.kind);
      if (strokeReview) {
        if (["swish", "swishFast"].includes(sample.kind))
          assert(
            sample.peakWindowRms >= (whoosh ? 0.002 : 0.008),
            `${sample.kind}: the stroke remains audible`,
          );
        continue;
      }
      if (airSwish) {
        if (["swish", "swishFast"].includes(sample.kind))
          assert(sample.peakWindowRms >= 0.008, `${sample.kind}: movement must remain audible`);
        if (sample.kind === "swish") {
          const ratio = sample.peakWindowRms / previous.peakWindowRms;
          assert(
            ratio >= 0.6 && ratio <= 1.6,
            "ordinary steering retains a comparable audible level",
          );
        }
        continue;
      }
      if (swishReview) {
        if (["swishSlow", "swish", "swishFast"].includes(sample.kind)) {
          const change = 20 * Math.log10(sample.peakWindowRms / previous.peakWindowRms);
          assert(
            change > 11.5 && change < 12.5,
            `${sample.kind}: expected about 12dB stronger movement`,
          );
        }
        continue;
      }
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
          change > (sample.kind === "swish" ? 16.5 : 4.5) &&
            change < (sample.kind === "swish" ? 17.5 : 5.5),
          `${sample.kind}: expected the authored effects gain`,
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
