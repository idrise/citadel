import { chromium } from "@playwright/test";
import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

// Run alongside `pnpm dev`. Audio is generated offline, without playing through speakers.
const output = process.argv[2] ?? "/tmp/citadel-music-preview.wav";
const origin = process.argv[3] ?? "http://127.0.0.1:5173";
const modulePath = fileURLToPath(new URL("./music-preview.ts", import.meta.url));
const browser = await chromium.launch({ channel: "chromium" });
try {
  const page = await browser.newPage();
  await page.route("**/__music-preview", (route) =>
    route.fulfill({ contentType: "text/html", body: "<body></body>" }),
  );
  await page.goto(`${origin}/__music-preview`);
  const { wav, ...stats } = await page.evaluate(async (path) => {
    const { renderMusicPreview } = await import(`/@fs${path}`);
    return renderMusicPreview();
  }, modulePath);
  await writeFile(output, Buffer.from(wav, "base64"));
  console.log(JSON.stringify({ output, ...stats }, null, 2));
} finally {
  await browser.close();
}
