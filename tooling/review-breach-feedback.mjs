import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
const directory = process.argv[2] ?? "/tmp/citadel-breaches",
  origin = process.argv[3] ?? "http://127.0.0.1:5173";
await mkdir(directory, { recursive: true });
const browser = await chromium.launch({ channel: "chromium" }),
  errors = [],
  samples = [];
try {
  for (const human of [0, 5]) {
    const page = await browser.newPage();
    page.on("pageerror", (e) => errors.push(e.message));
    await page.addInitScript(() => {
      const connect = Object.getOwnPropertyDescriptor(AudioNode.prototype, "connect").value;
      AudioNode.prototype.connect = function (destination, ...args) {
        const result = Reflect.apply(connect, this, [destination, ...args]);
        if (destination === this.context.destination && this.context === window.feedbackHost) {
          const tap = window.feedbackCapture?.tap ?? this.context.createMediaStreamDestination(),
            analyser = window.feedbackCapture?.analyser ?? this.context.createAnalyser();
          analyser.fftSize = 4096;
          Reflect.apply(connect, this, [tap]);
          Reflect.apply(connect, this, [analyser]);
          window.feedbackCapture = { tap, analyser };
        }
        return result;
      };
    });
    await page.route("**/__breach-feedback", (route) =>
      route.fulfill({ contentType: "text/html", body: "<body></body>" }),
    );
    await page.goto(`${origin}/__breach-feedback`);
    await page.evaluate(
      async ({ path, human }) => {
        const { mountBreachReview } = await import(`/@fs${path}`);
        window.review = mountBreachReview(human);
      },
      { path: fileURLToPath(new URL("./breach-feedback-review.ts", import.meta.url)), human },
    );
    await page.getByRole("button", { name: "Start", exact: true }).click();
    await page.getByLabel("Music status", { exact: true }).filter({ hasText: "playing" }).waitFor();
    for (const [name, label] of [
      ["success", "Your score"],
      ["loss", "Your loss"],
      ["overlap", "Mixed breaches"],
    ]) {
      await page.evaluate(() => {
        const recorder = new MediaRecorder(window.feedbackCapture.tap.stream, {
            mimeType: "audio/webm;codecs=opus",
          }),
          chunks = [];
        recorder.ondataavailable = (e) => chunks.push(e.data);
        window.recording = { recorder, chunks };
        recorder.start();
      });
      await page.getByRole("button", { name: label, exact: true }).click();
      const peakRms = await page.evaluate(async () => {
        const analyser = window.feedbackCapture.analyser,
          data = new Float32Array(analyser.fftSize);
        let peak = 0;
        for (let i = 0; i < 100; i++) {
          analyser.getFloatTimeDomainData(data);
          peak = Math.max(peak, Math.sqrt(data.reduce((sum, x) => sum + x * x, 0) / data.length));
          await new Promise((resolve) => setTimeout(resolve, 25));
        }
        return peak;
      });
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
      await writeFile(`${directory}/seat-${human}-${name}.webm`, Buffer.from(data, "base64"));
      samples.push({
        human,
        name,
        peakRms,
        contextState: await page.evaluate(() => window.feedbackHost.state),
        status: await page.getByLabel("Music status", { exact: true }).textContent(),
      });
      await page.waitForTimeout(350);
    }
    await page.evaluate(() => window.review.dispose());
    await page.close();
  }
  await writeFile(
    `${directory}/live-audio.json`,
    JSON.stringify(
      {
        kind: "Actual rule events, observer, music session and native Tone engine; score silent for isolated review; master 45%",
        samples,
        errors,
      },
      null,
      2,
    ) + "\n",
  );
  if (errors.length || samples.some((s) => s.peakRms < 0.01 || s.status !== "playing"))
    throw Error("A live breach cue is missing/inaudible or audio stopped");
  console.log(JSON.stringify({ samples, errors }));
} finally {
  await browser.close();
}
