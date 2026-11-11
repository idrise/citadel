import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
const directory = process.argv[2] ?? "/tmp/citadel-scene-victory",
  origin = process.argv[3] ?? "http://127.0.0.1:5173";
await mkdir(directory, { recursive: true });
const browser = await chromium.launch({ channel: "chromium" });
try {
  const page = await browser.newPage({
      viewport: { width: 1280, height: 900 },
      reducedMotion: "no-preference",
    }),
    errors = [],
    owners = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(() => {
    const connect = Object.getOwnPropertyDescriptor(AudioNode.prototype, "connect").value;
    window.outputCaptures = [];
    AudioNode.prototype.connect = function (destination, ...args) {
      const result = Reflect.apply(connect, this, [destination, ...args]);
      if (destination === this.context.destination) {
        let capture = window.outputCaptures.find((c) => c.context === this.context);
        if (!capture) {
          capture = {
            context: this.context,
            tap: this.context.createMediaStreamDestination(),
            analyser: this.context.createAnalyser(),
          };
          capture.analyser.fftSize = 4096;
          window.outputCaptures.push(capture);
        }
        Reflect.apply(connect, this, [capture.tap]);
        Reflect.apply(connect, this, [capture.analyser]);
      }
      return result;
    };
  });
  await page.goto(origin);
  for (let i = 0; i < 2; i++)
    await page.getByRole("button", { name: "Decrease players", exact: true }).click();
  await page.screenshot({ path: `${directory}/title.png` });
  await page.getByRole("button", { name: "Start", exact: true }).click();
  await page.getByLabel("Music status", { exact: true }).filter({ hasText: "playing" }).waitFor();
  let recording = false;
  for (let seconds = 0; seconds < 120; seconds++) {
    await page.waitForTimeout(1000);
    owners.push({
      second: seconds + 1,
      owner:
        (await page.getByLabel("Ball 0 owner", { exact: true }).allTextContents())[0] ?? "finished",
    });
    if (seconds === 15) await page.screenshot({ path: `${directory}/owned-ball.png` });
    if (seconds >= 24 && !recording) {
      await page.evaluate(() => {
        const capture = window.outputCaptures.find((c) => c.context.state === "running"),
          stream = new MediaStream([
            ...document.querySelector("canvas").captureStream(30).getVideoTracks(),
            ...capture.tap.stream.getAudioTracks(),
          ]),
          recorder = new MediaRecorder(stream, {
            mimeType: "video/webm;codecs=vp9,opus",
            videoBitsPerSecond: 1500000,
            audioBitsPerSecond: 128000,
          }),
          chunks = [];
        recorder.ondataavailable = (e) => chunks.push(e.data);
        window.recording = { recorder, chunks };
        recorder.start(1000);
      });
      recording = true;
    }
    if ((await page.getByLabel("Round phase", { exact: true }).textContent()) === "finished") break;
  }
  const winner = await page.getByLabel("Round winner", { exact: true }).textContent();
  if (winner !== "You win") throw Error(`Expected the established idle human win, got ${winner}`);
  if (await page.locator(".menu-panel").count()) throw Error("Victory created a DOM popup");
  const ending = [];
  for (let i = 0; i < 28; i++) {
    await page.waitForTimeout(250);
    const rms = await page.evaluate(() => {
      const capture = window.outputCaptures.find((c) => c.context.state === "running"),
        data = new Float32Array(capture.analyser.fftSize);
      capture.analyser.getFloatTimeDomainData(data);
      return Math.sqrt(data.reduce((s, x) => s + x * x, 0) / data.length);
    });
    ending.push({
      seconds: (i + 1) / 4,
      rms,
      status: await page.getByLabel("Music status", { exact: true }).textContent(),
    });
    if (i === 3) await page.screenshot({ path: `${directory}/fireworks.png` });
    if (i === 15) await page.screenshot({ path: `${directory}/victory.png` });
  }
  const data = await page.evaluate(async () => {
    const { recorder, chunks } = window.recording;
    await new Promise((resolve) => {
      recorder.onstop = resolve;
      recorder.stop();
    });
    const bytes = new Uint8Array(await new Blob(chunks).arrayBuffer());
    let binary = "";
    for (let i = 0; i < bytes.length; i += 16384)
      binary += String.fromCharCode(...bytes.subarray(i, i + 16384));
    return btoa(binary);
  });
  await writeFile(`${directory}/victory.webm`, Buffer.from(data, "base64"));
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("button", { name: "Export round", exact: true }).click();
  await (await downloadPromise).saveAs(`${directory}/round.json`);
  const report = {
    kind: "Native real-time two-player standard match, seed 2026, human seat 0, no state edits, High effects/music on",
    winner,
    owners,
    ending,
    errors,
  };
  await writeFile(`${directory}/live-scene.json`, JSON.stringify(report, null, 2) + "\n");
  if (
    errors.length ||
    ending.some((frame) => frame.status === "unavailable") ||
    !ending.some((frame) => frame.seconds >= 2 && frame.rms > 0.0005)
  )
    throw Error("Scene review has page errors or an inaudible/failed victory coda");
  console.log(JSON.stringify(report));
} finally {
  await browser.close();
}
