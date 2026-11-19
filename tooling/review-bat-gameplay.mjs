import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "@playwright/test";
import { installVirtualBrowserControls } from "../tests/virtual-input.ts";

const origin = process.argv[2] ?? "http://127.0.0.1:5182";
const directory = process.argv[3] ?? "docs/reviews/m09/bat-glide";
await mkdir(directory, { recursive: true });
const browser = await chromium.launch({ channel: "chromium" });
try {
  const page = await browser.newPage({ viewport: { width: 960, height: 720 } });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(installVirtualBrowserControls);
  await page.addInitScript(() => {
    const connect = Object.getOwnPropertyDescriptor(AudioNode.prototype, "connect").value;
    AudioNode.prototype.connect = function (destination, ...args) {
      const result = Reflect.apply(connect, this, [destination, ...args]);
      if (destination === this.context.destination) {
        const tap =
          window.batAudio?.context === this.context
            ? window.batAudio
            : this.context.createMediaStreamDestination();
        Reflect.apply(connect, this, [tap]);
        window.batAudio = tap;
      }
      return result;
    };
  });
  await page.goto(`${origin}/?seed=2026`);
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByLabel("Music volume", { exact: true }).fill("0.2");
  await page.getByLabel("Sound effects volume", { exact: true }).fill("1");
  await page.getByLabel("Graphics quality", { exact: true }).fill("0");
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await page.getByRole("button", { name: "Start", exact: true }).click();
  await page.waitForFunction(
    () => document.querySelector('[aria-label="Round phase"]')?.textContent === "playing",
    null,
    { timeout: 20000 },
  );
  const capture = await page.evaluate(async () => {
    if (!window.batAudio || window.batAudio.context.state !== "running")
      throw Error("Live audio capture is unavailable");
    const stream = new MediaStream([
      ...document.querySelector("canvas").captureStream(24).getVideoTracks(),
      ...window.batAudio.stream.getAudioTracks(),
    ]);
    const chunks = [];
    const recorder = new MediaRecorder(stream, {
      mimeType: "video/webm;codecs=vp9,opus",
      videoBitsPerSecond: 1200000,
      audioBitsPerSecond: 160000,
    });
    recorder.ondataavailable = (e) => chunks.push(e.data);
    recorder.start();
    for (let frame = 0; frame < 240; frame++) {
      const time = frame / 30;
      const x =
        time < 0.8
          ? 0
          : time < 2.2
            ? 3 * Math.sin(time * Math.PI * 6)
            : time < 3.2
              ? 0
              : time < 6.7
                ? 80 * Math.sin((time - 3.2) * Math.PI * 2.4)
                : 0;
      window.__citadelTestInput.move(x, 0);
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
    return {
      video: btoa(binary),
      phase: document.querySelector('[aria-label="Round phase"]').textContent,
      health: document.querySelector('[aria-label="Coral health"]').textContent,
    };
  });
  await writeFile(`${directory}/gameplay.webm`, Buffer.from(capture.video, "base64"));
  assert.deepEqual(errors, []);
  assert.equal(capture.phase, "playing");
  const report = {
    kind: "Native real-time game with ordinary document-local movement input; small corrections, repeated strokes and rest",
    seed: 2026,
    music: 0.2,
    effects: 1,
    ...capture,
    errors,
  };
  delete report.video;
  await writeFile(`${directory}/gameplay.json`, JSON.stringify(report, null, 2) + "\n");
} finally {
  await browser.close();
}
