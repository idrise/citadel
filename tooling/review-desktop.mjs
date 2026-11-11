import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
const directory = process.argv[2] ?? "/tmp/citadel-desktop",
  origin = process.argv[3] ?? "http://127.0.0.1:5173";
await mkdir(directory, { recursive: true });
const browser = await chromium.launch({ channel: "chromium" });
try {
  const page = await browser.newPage({
      viewport: { width: 1280, height: 900 },
      reducedMotion: "no-preference",
    }),
    errors = [],
    warnings = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
    if (message.type() === "warning" && warnings.length < 12) warnings.push(message.text());
  });
  await page.addInitScript(() => {
    const connect = Object.getOwnPropertyDescriptor(AudioNode.prototype, "connect")?.value;
    if (typeof connect !== "function") throw Error("Native audio connection is unavailable");
    AudioNode.prototype.connect = function (destination, ...args) {
      const result = Reflect.apply(connect, this, [destination, ...args]);
      if (destination === this.context.destination) {
        const tap = this.context.createMediaStreamDestination();
        Reflect.apply(connect, this, [tap]);
        window.audioCapture = tap;
      }
      return result;
    };
  });
  await page.goto(origin);
  await page.getByLabel("Players", { exact: true }).selectOption("6");
  await page.screenshot({ path: `${directory}/desktop-start.png` });
  await page.getByText("How to play", { exact: true }).click();
  await page.screenshot({ path: `${directory}/desktop-help.png` });
  await page.getByText("How to play", { exact: true }).click();
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.waitForFunction(() => Boolean(window.audioCapture));
  await page.getByLabel("Music status", { exact: true }).filter({ hasText: "playing" }).waitFor();
  await page.evaluate(() => {
    const stream = new MediaStream([
        ...document.querySelector("canvas").captureStream(30).getVideoTracks(),
        ...window.audioCapture.stream.getAudioTracks(),
      ]),
      recorder = new MediaRecorder(stream, {
        mimeType: "video/webm;codecs=vp9,opus",
        videoBitsPerSecond: 2400000,
        audioBitsPerSecond: 160000,
      });
    window.recording = { recorder, chunks: [] };
    recorder.ondataavailable = (event) => window.recording.chunks.push(event.data);
    recorder.start(1000);
  });
  // Real time, unchanged seed/default pacing; only ordinary player inputs.
  for (let second = 0; second < 32; second++) {
    if (second % 4 === 0) await page.mouse.move(second % 8 ? 700 : 580, 450);
    await page.waitForTimeout(1000);
    if (second === 17) await page.screenshot({ path: `${directory}/desktop-gameplay.png` });
  }
  const bytes = await page.evaluate(async () => {
    const recording = window.recording;
    await new Promise((resolve) => {
      recording.recorder.onstop = resolve;
      recording.recorder.stop();
    });
    const blob = new Blob(recording.chunks, { type: recording.recorder.mimeType }),
      data = new Uint8Array(await blob.arrayBuffer());
    let binary = "";
    for (let i = 0; i < data.length; i += 16384)
      binary += String.fromCharCode(...data.subarray(i, i + 16384));
    return btoa(binary);
  });
  await writeFile(`${directory}/desktop-gameplay.webm`, Buffer.from(bytes, "base64"));
  await page.keyboard.press("KeyP");
  await page.getByText("Settings", { exact: true }).click();
  await page.screenshot({ path: `${directory}/desktop-settings.png` });
  await writeFile(
    `${directory}/desktop-capture.json`,
    JSON.stringify(
      { kind: "Native real-time gameplay; six seats, default pacing, music on", errors, warnings },
      null,
      2,
    ) + "\n",
  );
  if (errors.length) throw Error("Desktop capture has browser errors");
  console.log(JSON.stringify({ directory, errors, warnings }));
} finally {
  await browser.close();
}
