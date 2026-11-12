import { chromium } from "@playwright/test";
import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
const browser = await chromium.launch({ channel: "chromium" });
const directory = "docs/reviews/m09/mobile-todos",
  origin = process.argv[2] ?? "http://localhost:5177";
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } }),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route("**/__morph-review", (r) =>
    r.fulfill({
      contentType: "text/html",
      body: '<link rel="stylesheet" href="/src/app/styles.css?direct"><div id="review"></div>',
    }),
  );
  await page.goto(`${origin}/__morph-review`);
  await page.evaluate(
    async (path) => {
      const { createMorphReview } = await import(`/@fs${path}`);
      window.morphReview = createMorphReview(document.getElementById("review"));
    },
    fileURLToPath(new URL("./todo-visual-review.ts", import.meta.url)),
  );
  const data = await page.evaluate(async () => {
    const recorder = new MediaRecorder(document.querySelector("canvas").captureStream(30), {
        mimeType: "video/webm;codecs=vp9",
        videoBitsPerSecond: 2000000,
      }),
      chunks = [];
    recorder.ondataavailable = (e) => chunks.push(e.data);
    recorder.start();
    for (const count of [3, 4, 5, 6, 4, 2]) {
      window.morphReview.next(count);
      for (let i = 0; i < 36; i++) {
        window.morphReview.frame(1 / 30);
        await new Promise((r) => setTimeout(r, 1000 / 30));
      }
    }
    await new Promise((r) => {
      recorder.onstop = r;
      recorder.stop();
    });
    const bytes = new Uint8Array(await new Blob(chunks).arrayBuffer());
    let str = "";
    for (let i = 0; i < bytes.length; i += 16384)
      str += String.fromCharCode(...bytes.subarray(i, i + 16384));
    return btoa(str);
  });
  await writeFile(`${directory}/wall-morph.webm`, Buffer.from(data, "base64"));
  for (const count of [2, 4, 6]) {
    await page.evaluate((count) => {
      window.morphReview.next(count);
      for (let i = 0; i < 60; i++) window.morphReview.frame(1 / 60);
    }, count);
    await page.screenshot({ path: `${directory}/desktop-title-${count}.png` });
  }
  await page.evaluate(() => window.morphReview.dispose());
  console.log({ errors });
} finally {
  await browser.close();
}
