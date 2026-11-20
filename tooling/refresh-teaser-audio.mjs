import { chromium } from "@playwright/test";
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { installVirtualBrowserControls } from "../tests/virtual-input.ts";
const origin = process.argv[2] ?? "http://127.0.0.1:5190";
const directory = process.argv[3] ?? "/private/tmp/citadel-teaser-v4-work";
const browser = await chromium.launch({ channel: "chromium" });
try {
  const page = await browser.newPage();
  await page.addInitScript(installVirtualBrowserControls);
  await page.route("**/__teaser-audio", (route) =>
    route.fulfill({ contentType: "text/html", body: "<body></body>" }),
  );
  await page.goto(`${origin}/__teaser-audio`);
  const pitch = await page.evaluate(
    async (path) => {
      const { checkTeaserPitch } = await import(`/@fs${path}`);
      return checkTeaserPitch();
    },
    fileURLToPath(new URL("./teaser-pitch-check.ts", import.meta.url)),
  );
  await writeFile(`${directory}/pitch-check.json`, JSON.stringify(pitch, null, 2) + "\n");
  console.log(JSON.stringify(pitch));
  // Keep the music export in a fresh realm, isolated from the deliberately mixed-rate probe.
  await page.reload();
  const log = JSON.parse(await readFile(`${directory}/events.json`, "utf8"));
  const audio = await page.evaluate(
    async ({ path, log }) => {
      await import("/@vite/env");
      const { renderTeaserAudio } = await import(`/@fs${path}`);
      return renderTeaserAudio(log);
    },
    { path: fileURLToPath(new URL("./teaser-scene.ts", import.meta.url)), log },
  );
  await writeFile(`${directory}/effects.wav`, Buffer.from(audio.effects.wav, "base64"));
  await writeFile(`${directory}/score.wav`, Buffer.from(audio.score.wav, "base64"));
  delete audio.effects.wav;
  delete audio.score.wav;
  await writeFile(`${directory}/audio.json`, JSON.stringify(audio, null, 2) + "\n");
} finally {
  await browser.close();
}
