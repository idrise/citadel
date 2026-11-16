import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { installVirtualBrowserControls } from "../tests/virtual-input.ts";

const directory = "docs/reviews/morph-studio";
const origin = process.argv[2] ?? "http://127.0.0.1:5177";
await mkdir(directory, { recursive: true });
const browser = await chromium.launch({ channel: "chromium" });
const errors = [],
  samples = [];
try {
  for (const mobile of [false, true]) {
    const page = await browser.newPage({
      viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 },
      isMobile: mobile,
      hasTouch: mobile,
    });
    await page.addInitScript(installVirtualBrowserControls);
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    await page.goto(`${origin}/morph.html`);
    await page.waitForFunction(() => window.__morphStudio);
    for (const profile of ["classic", "rounded"]) {
      await page.selectOption("#shape", profile);
      for (const scenario of ["6-5", "4-3", "3-2", "title", "victory", "next"]) {
        await page.evaluate((name) => window.__morphStudio.load(name), scenario);
        for (const progress of [0, 0.1, 0.5, 0.9, 1]) {
          await page.evaluate((progress) => {
            const studio = window.__morphStudio;
            const target = studio.snapshot.duration * progress;
            while (studio.snapshot.elapsed < target - 1e-8)
              studio.advance(Math.min(1 / 60, target - studio.snapshot.elapsed));
            studio.advance(Math.max(0, target - studio.snapshot.elapsed));
          }, progress);
          const sample = await page.evaluate(() => window.__morphStudio.snapshot);
          assert(Math.abs(sample.elapsed / sample.duration - progress) < 1e-6);
          samples.push({ mobile, profile, progress, ...sample });
          if (
            (!mobile && ["6-5", "3-2", "victory"].includes(scenario)) ||
            (mobile && scenario === "4-3")
          )
            await page.screenshot({
              path: `${directory}/${mobile ? "phone" : "desktop"}-${profile}-${scenario}-${progress}.png`,
            });
        }
      }
    }
    if (!mobile) {
      await page.selectOption("#shape", "rounded");
      const video = await page.evaluate(async () => {
        window.__morphStudio.load("6-5");
        const canvas = document.querySelector("canvas");
        const stream = canvas.captureStream(30);
        const recorder = new MediaRecorder(stream, {
          mimeType: "video/webm;codecs=vp9",
          videoBitsPerSecond: 5000000,
        });
        const chunks = [];
        recorder.ondataavailable = (event) => chunks.push(event.data);
        recorder.start();
        for (const scenario of ["6-5", "4-3", "3-2", "victory", "next"]) {
          if (scenario !== "6-5") window.__morphStudio.transition(scenario);
          for (let frame = 0; frame < 450; frame++) {
            window.__morphStudio.advance(1 / 30);
            await new Promise((resolve) => setTimeout(resolve, 1000 / 30));
            const pose = window.__morphStudio.snapshot;
            if (!pose.preparing && !pose.queuedNext && pose.elapsed >= pose.duration) break;
          }
          for (let frame = 0; frame < 12; frame++) {
            window.__morphStudio.advance(0);
            await new Promise((resolve) => setTimeout(resolve, 1000 / 30));
          }
        }
        await new Promise((resolve) => {
          recorder.onstop = resolve;
          recorder.stop();
        });
        stream.getTracks().forEach((track) => track.stop());
        const bytes = new Uint8Array(await new Blob(chunks).arrayBuffer());
        let data = "";
        for (let i = 0; i < bytes.length; i += 16384)
          data += String.fromCharCode(...bytes.subarray(i, i + 16384));
        return btoa(data);
      });
      await writeFile(`${directory}/transitions.webm`, Buffer.from(video, "base64"));
    }
    await page.close();
  }
  assert.deepEqual(errors, []);
  await writeFile(
    `${directory}/report.json`,
    JSON.stringify(
      {
        kind: "Authored deterministic transition poses through real viewport; no gameplay outcome claimed",
        samples,
        errors,
      },
      null,
      2,
    ) + "\n",
  );
  console.log({ samples: samples.length, errors });
} finally {
  await browser.close();
}
