import { execFileSync } from "node:child_process";
import { stripTypeScriptTypes } from "node:module";
import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
const origin = process.argv.find((arg) => arg.startsWith("http")) ?? "http://127.0.0.1:5181";
const directory = "docs/reviews/m09/todo-followup";
const before = process.argv.includes("--before");
const revision = "cabef60";
await mkdir(directory, { recursive: true });
const browser = await chromium.launch({ channel: "chromium" });
const samples = [],
  errors = [];
try {
  const page = await browser.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  if (before)
    for (const name of ["drums", "melodic"]) {
      const body = execFileSync("git", ["show", `${revision}:apps/web/src/audio/tone-${name}.ts`], {
        encoding: "utf8",
      });
      await page.route(`**/tone-${name}.ts*`, async (r) => {
        const response = await r.fetch();
        const compiled = await response.text();
        const tonePath = compiled.match(/import \* as Tone from "([^"]+)"/)[1];
        await r.fulfill({
          response,
          body: stripTypeScriptTypes(body).replace('"tone"', JSON.stringify(tonePath)),
        });
      });
    }
  await page.route("**/__mix-review", (r) =>
    r.fulfill({ contentType: "text/html", body: "<title>Citadel music mix</title>" }),
  );
  await page.goto(`${origin}/__mix-review`);
  for (const { name, options } of [
    { name: "intro", options: { duration: 7, balls: 1 } },
    { name: "build", options: { duration: 7, startStep: 192, balls: 4 } },
    { name: "drop", options: { duration: 14, startStep: 256, balls: 4 } },
    {
      name: "drums",
      options: {
        duration: 14,
        startStep: 256,
        balls: 4,
        voices: ["kick", "hat", "openHat", "snare", "clap", "crash"],
      },
    },
    {
      name: "melody",
      options: {
        duration: 14,
        startStep: 256,
        balls: 4,
        voices: ["lead", "pad", "bass", "sub", "arp", "player", "riser", "answer", "unlock"],
      },
    },
  ]) {
    const { wav, ...stats } = await page.evaluate(
      async ({ path, options }) => {
        const { renderMusicPreview } = await import(`/@fs${path}`);
        return renderMusicPreview({ ...options, hits: false });
      },
      { path: fileURLToPath(new URL("./music-preview.ts", import.meta.url)), options },
    );
    assert(stats.peak < 0.75);
    assert(stats.rms > 0.001);
    if (name === "drop")
      await writeFile(
        `${directory}/${before ? "before" : "after"}-${name}.wav`,
        Buffer.from(wav, "base64"),
      );
    samples.push({ name, ...stats });
  }
  assert.deepEqual(errors, []);
  await writeFile(
    `${directory}/${before ? "before" : "after"}-mix.json`,
    JSON.stringify({ samples, errors }, null, 2) + "\n",
  );
  console.log(samples);
} finally {
  await browser.close();
}
