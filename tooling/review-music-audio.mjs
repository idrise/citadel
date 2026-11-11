import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const directory = process.argv[2] ?? "/tmp/citadel-club-review";
const origin = process.argv[3] ?? "http://127.0.0.1:5173";
const path = fileURLToPath(new URL("./music-preview.ts", import.meta.url));
await mkdir(directory, { recursive: true });
const browser = await chromium.launch({ channel: "chromium" });
try {
  const page = await browser.newPage(),
    errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/__club-audio", (route) =>
    route.fulfill({ contentType: "text/html", body: "<body></body>" }),
  );
  await page.goto(`${origin}/__club-audio`);
  const stems = {};
  const cases = [
    {
      name: "drums",
      options: {
        duration: (64 * 60) / 136 / 4,
        startStep: 64,
        hits: false,
        voices: ["kick", "hat", "openHat", "clap", "snare", "crash"],
      },
    },
    {
      name: "bass",
      options: {
        duration: (64 * 60) / 136 / 4,
        startStep: 64,
        hits: false,
        voices: ["bass", "sub"],
      },
    },
    {
      name: "melody",
      options: {
        duration: (64 * 60) / 136 / 4,
        startStep: 64,
        hits: false,
        voices: ["lead", "pad", "arp"],
      },
    },
    { name: "club-preview", options: { duration: 74, hits: true } },
    { name: "no-hit-preview", options: { duration: 34, hits: false } },
    { name: "cheer", options: { duration: 4.5, demo: "cheer", voices: ["cheer"], hits: false } },
    {
      name: "success",
      options: { duration: 4.5, demo: "success", voices: ["success", "cheer"], hits: false },
    },
    { name: "loss", options: { duration: 3, demo: "loss", voices: ["damage"], hits: false } },
    {
      name: "success-mix",
      options: { duration: 5, demo: "success", startStep: 256, balls: 4, hits: false },
    },
    {
      name: "loss-mix",
      options: { duration: 5, demo: "loss", startStep: 256, balls: 4, hits: false },
    },
    { name: "layers", options: { duration: (256 * 60) / 136 / 4, demo: "layers", hits: false } },
  ];
  for (const { name, options } of cases) {
    const { wav, ...stats } = await page.evaluate(
      async ({ path, options }) => {
        const { renderMusicPreview } = await import(`/@fs${path}`);
        return renderMusicPreview(options);
      },
      { path, options },
    );
    await writeFile(`${directory}/${name}.wav`, Buffer.from(wav, "base64"));
    stems[name] = stats;
  }
  const melodyToDrumsDb = 20 * Math.log10(stems.melody.rms / stems.drums.rms);
  const bassToDrumsDb = 20 * Math.log10(stems.bass.rms / stems.drums.rms);
  const report = { stems, melodyToDrumsDb, bassToDrumsDb, errors };
  await writeFile(`${directory}/audio-stats.json`, JSON.stringify(report, null, 2) + "\n");
  if (
    errors.length ||
    melodyToDrumsDb < -6 ||
    bassToDrumsDb < -9 ||
    stems["club-preview"].peak >= 0.98 ||
    stems.cheer.rms < 0.004 ||
    stems.cheer.peak >= 0.98 ||
    stems.success.rms < 0.004 ||
    stems.success.peak >= 0.98 ||
    stems.loss.rms < 0.004 ||
    stems.loss.peak >= 0.98 ||
    stems["no-hit-preview"].rms < 0.01
  )
    throw Error(
      "Audio review failed: missing/weak voices, clipping, or browser errors. Inspect audio-stats.json.",
    );
  console.log(
    JSON.stringify(
      { directory, melodyToDrumsDb, bassToDrumsDb, peak: stems["club-preview"].peak, errors },
      null,
      2,
    ),
  );
} finally {
  await browser.close();
}
