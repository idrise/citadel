import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
const directory = process.argv[2] ?? "/tmp/citadel-victory-morph",
  origin = process.argv[3] ?? "http://127.0.0.1:5176";
await mkdir(directory, { recursive: true });
const browser = await chromium.launch({ channel: "chromium" });
const errors = [];
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await page.route("**/__victory-review", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: '<link rel="stylesheet" href="/src/app/styles.css?direct"><div id="review"></div>',
    }),
  );
  await page.goto(`${origin}/__victory-review`);
  const mount = async (count, winner = 0, reduced = false, width = 1280, height = 900) => {
    await page.setViewportSize({ width, height });
    await page.evaluate(
      async ({ path, count, winner, reduced, width, height }) => {
        const { renderVictoryReview } = await import(`/@fs${path}`);
        window.victoryReview?.dispose();
        window.victoryReview = renderVictoryReview(
          document.getElementById("review"),
          count,
          winner,
          reduced,
          width,
          height,
        );
      },
      {
        path: fileURLToPath(new URL("./victory-review.ts", import.meta.url)),
        count,
        winner,
        reduced,
        width,
        height,
      },
    );
  };
  const advance = async (from, to) =>
    page.evaluate(
      async ({ from, to }) => {
        for (let time = from; time < to; time += 1 / 30) window.victoryReview.render(time);
        window.victoryReview.render(to);
      },
      { from, to },
    );
  for (const count of [2, 4, 6]) {
    await mount(count);
    await page.screenshot({ path: `${directory}/arena-${count}-start.png` });
    await advance(0, 1.4);
    await page.screenshot({ path: `${directory}/arena-${count}-middle.png` });
    await advance(1.4, 3.4);
    await page.screenshot({ path: `${directory}/arena-${count}-star.png` });
  }
  await mount(6, 4);
  await advance(0, 3.4);
  await page.screenshot({ path: `${directory}/bot-winner.png` });
  await mount(4, 0, false, 390, 844);
  await advance(0, 3.4);
  await page.screenshot({ path: `${directory}/mobile-star.png` });
  await advance(3.4, 5.5);
  await page.screenshot({ path: `${directory}/mobile-rematch.png` });
  await mount(2, 1, true);
  await page.screenshot({ path: `${directory}/reduced-star.png` });
  await mount(4);
  await page.evaluate(async () => {
    const stream = document.querySelector("canvas").captureStream(30);
    const recorder = new MediaRecorder(stream, {
      mimeType: "video/webm;codecs=vp9",
      videoBitsPerSecond: 2500000,
    });
    const chunks = [];
    recorder.ondataavailable = (e) => chunks.push(e.data);
    recorder.start();
    for (let frame = 0; frame <= 180; frame++) {
      window.victoryReview.render(frame / 30);
      await new Promise((resolve) => setTimeout(resolve, 1000 / 30));
    }
    await new Promise((resolve) => {
      recorder.onstop = resolve;
      recorder.stop();
    });
    const bytes = new Uint8Array(await new Blob(chunks).arrayBuffer());
    let binary = "";
    for (let i = 0; i < bytes.length; i += 16384)
      binary += String.fromCharCode(...bytes.subarray(i, i + 16384));
    window.victoryVideo = btoa(binary);
  });
  await writeFile(
    `${directory}/morph.webm`,
    Buffer.from(await page.evaluate(() => window.victoryVideo), "base64"),
  );
  await page.evaluate(() => window.victoryReview.dispose());
  assert.deepEqual(errors, []);
  await writeFile(
    `${directory}/report.json`,
    JSON.stringify(
      {
        kind: "Native GPU presentation fixtures; finished match remains unchanged",
        counts: [2, 4, 6],
        humanAndBotWinners: true,
        mobile: "390x844 emulation",
        errors,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(JSON.stringify({ directory, errors }));
} finally {
  await browser.close();
}
