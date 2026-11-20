import { chromium } from "@playwright/test";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { installVirtualBrowserControls } from "../tests/virtual-input.ts";

const origin = process.argv[2] ?? "http://127.0.0.1:5190";
const directory = process.argv[3] ?? "/private/tmp/citadel-teaser-v4-work";
const previewOnly = process.argv.includes("--preview");
const only = process.argv.find((argument) => argument.startsWith("--shot="))?.split("=")[1];
await mkdir(directory, { recursive: true });
const browser = await chromium.launch({ channel: "chromium" });
const errors = [];
try {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 2,
  });
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.addInitScript(installVirtualBrowserControls);
  await page.route("**/__teaser", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: '<link rel="stylesheet" href="/src/app/styles.css?direct"><div id="stage" style="position:relative;width:1280px;height:720px"></div>',
    }),
  );
  await page.goto(`${origin}/__teaser`);
  const modulePath = fileURLToPath(new URL("./teaser-scene.ts", import.meta.url));
  const shots = await page.evaluate(async (path) => {
    await import("/@vite/env");
    window.teaserModule = await import(`/@fs${path}`);
    window.teaserLog = [];
    return window.teaserModule.TEASER_SHOTS;
  }, modulePath);
  const summaries = [];
  for (const shot of shots) {
    if (only && shot.id !== only) continue;
    console.log(`Capturing ${shot.id}: ${shot.frames} frames`);
    const summary = await page.evaluate(
      async ({ shot, previewOnly }) => {
        window.teaserScene?.dispose();
        const module = window.teaserModule;
        const scene = module.createTeaserScene(document.getElementById("stage"), shot.id);
        window.teaserScene = scene;
        const config = {
          codec: "avc1.64002a",
          width: 1920,
          height: 1080,
          bitrate: 16000000,
          framerate: 60,
          avc: { format: "annexb" },
        };
        const support = await VideoEncoder.isConfigSupported(config);
        if (!support.supported) throw Error("H.264 WebCodecs capture unavailable");
        const chunks = [];
        let failure;
        const encoder = new VideoEncoder({
          output(chunk) {
            const bytes = new Uint8Array(chunk.byteLength);
            chunk.copyTo(bytes);
            chunks.push(bytes);
          },
          error(error) {
            failure = error;
          },
        });
        encoder.configure(config);
        const eventTypes = {};
        let maxSpin = 0;
        let still;
        let impactFrame;
        let maxPulse = 0;
        const frames = previewOnly ? 65 : shot.frames;
        for (let index = 0; index < frames; index++) {
          const frame = scene.frame(index, shot.frames);
          maxPulse = Math.max(maxPulse, scene.summary().musicPulse);
          if (shot.id === "curve-left" && scene.summary().curveHit && impactFrame === undefined)
            impactFrame = index;
          if (shot.id === "curve-left" && impactFrame !== undefined && index === impactFrame + 8) {
            const canvas = document.createElement("canvas");
            canvas.width = 2560;
            canvas.height = 1440;
            canvas.getContext("2d").drawImage(scene.view.canvas, 0, 0);
            still = canvas.toDataURL("image/png").split(",")[1];
          }
          maxSpin = Math.max(maxSpin, scene.summary().peakSpin);
          if (!previewOnly && !["title", "end"].includes(shot.id)) {
            window.teaserLog.push({ time: (shot.start + index) / 60, ...frame });
            for (const event of frame.events)
              eventTypes[event.type] = (eventTypes[event.type] ?? 0) + 1;
          }
          const videoFrame = new VideoFrame(scene.output, {
            timestamp: Math.round((index * 1000000) / 60),
            duration: Math.round(1000000 / 60),
          });
          encoder.encode(videoFrame, { keyFrame: index % 120 === 0 });
          videoFrame.close();
          if (encoder.encodeQueueSize > 6)
            await new Promise((resolve) =>
              encoder.addEventListener("dequeue", resolve, { once: true }),
            );
          if (index % 20 === 0) await new Promise((resolve) => setTimeout(resolve, 0));
          if (failure) throw failure;
        }
        await encoder.flush();
        encoder.close();
        const length = chunks.reduce((total, chunk) => total + chunk.length, 0);
        const bytes = new Uint8Array(length);
        let offset = 0;
        for (const chunk of chunks) {
          bytes.set(chunk, offset);
          offset += chunk.length;
        }
        let binary = "";
        for (let start = 0; start < bytes.length; start += 16384)
          binary += String.fromCharCode(...bytes.subarray(start, start + 16384));
        return {
          ...scene.summary(),
          id: shot.id,
          level: scene.level,
          frames,
          maxSpin,
          maxPulse,
          eventTypes,
          still,
          encoded: btoa(binary),
          environment: scene.view.environment(),
        };
      },
      { shot, previewOnly },
    );
    await writeFile(`${directory}/${shot.id}.h264`, Buffer.from(summary.encoded, "base64"));
    if (summary.still)
      await writeFile(`${directory}/${shot.id}-still.png`, Buffer.from(summary.still, "base64"));
    delete summary.encoded;
    delete summary.still;
    await page.screenshot({ path: `${directory}/${shot.id}.png` });
    summaries.push(summary);
    console.log(JSON.stringify(summary));
  }
  if (only && !previewOnly) {
    try {
      const master = JSON.parse(await readFile(`${directory}/capture.json`, "utf8"));
      master.summaries = master.summaries.map((item) => (item.id === only ? summaries[0] : item));
      master.errors = errors;
      const shot = shots.find((item) => item.id === only);
      const existing = JSON.parse(await readFile(`${directory}/events.json`, "utf8"));
      const replacement = await page.evaluate(() => window.teaserLog);
      const merged = existing
        .filter((frame) => frame.time < shot.start / 60 || frame.time >= shot.end / 60)
        .concat(replacement)
        .sort((a, b) => a.time - b.time);
      await writeFile(`${directory}/capture.json`, JSON.stringify(master, null, 2) + "\n");
      await writeFile(`${directory}/events.json`, JSON.stringify(merged) + "\n");
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }
  if (!previewOnly && !only) {
    console.log("Rendering continuous score and synchronised effects stems");
    const audio = await page.evaluate(() =>
      window.teaserModule.renderTeaserAudio(window.teaserLog),
    );
    await writeFile(`${directory}/effects.wav`, Buffer.from(audio.effects.wav, "base64"));
    await writeFile(`${directory}/score.wav`, Buffer.from(audio.score.wav, "base64"));
    delete audio.effects.wav;
    delete audio.score.wav;
    await writeFile(`${directory}/audio.json`, JSON.stringify(audio, null, 2) + "\n");
    await writeFile(
      `${directory}/events.json`,
      JSON.stringify(await page.evaluate(() => window.teaserLog)) + "\n",
    );
  }
  await writeFile(
    `${directory}/${only ? `capture-${only}` : "capture"}.json`,
    JSON.stringify({ shots, summaries, errors }, null, 2) + "\n",
  );
  if (errors.length) throw Error(errors.join("\n"));
} finally {
  await browser.close();
}
