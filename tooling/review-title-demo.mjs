import { installVirtualBrowserControls } from "../tests/virtual-input.ts";
import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";

const origin = process.argv[2] ?? "http://127.0.0.1:5188";
const directory = process.argv[3] ?? "artifacts/reviews/title-demo";
await mkdir(directory, { recursive: true });
const browser = await chromium.launch({ channel: "chromium" });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [],
    samples = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(installVirtualBrowserControls);
  await page.goto(`${origin}/?seed=2026`);
  await page.getByRole("button", { name: "Start", exact: true }).waitFor();
  const savedProgress = await page.evaluate(() => localStorage.getItem("citadel.progress.v1"));
  const controls = () =>
    Promise.all(
      ["Start", "Settings"].map((name) =>
        page.getByRole("button", { name, exact: true }).boundingBox(),
      ),
    );
  const bounds = await controls();
  const renderer = await page.evaluate(() => {
    const gl = document.querySelector("canvas").getContext("webgl2");
    const extension = gl.getExtension("WEBGL_debug_renderer_info");
    return extension
      ? gl.getParameter(extension.UNMASKED_RENDERER_WEBGL)
      : gl.getParameter(gl.RENDERER);
  });
  await page.evaluate(() => {
    const recorder = new MediaRecorder(document.querySelector("canvas").captureStream(30), {
      mimeType: "video/webm;codecs=vp9",
      videoBitsPerSecond: 3000000,
    });
    const chunks = [];
    recorder.ondataavailable = (event) => chunks.push(event.data);
    recorder.start();
    window.titleDemoRecording = { recorder, chunks };
  });
  for (const count of [2, 4, 6]) {
    await page.evaluate((count) => window.__citadelTestInput.session.roster(count, 0), count);
    await page.waitForTimeout(3000);
    await page.screenshot({ path: `${directory}/desktop-${count}.png` });
    assert.deepEqual(await controls(), bounds);
    assert.equal(
      await page.getByLabel("Title protected fortresses", { exact: true }).textContent(),
      String(count),
    );
    assert.equal(await page.getByLabel("Title damage", { exact: true }).textContent(), "0");
    samples.push({
      count,
      elapsed: await page.getByLabel("Title elapsed", { exact: true }).textContent(),
      returns: await page.getByLabel("Title returns", { exact: true }).textContent(),
    });
  }
  await page.waitForTimeout(16000);
  await page.screenshot({ path: `${directory}/desktop-6-rally.png` });
  assert.equal(await page.getByLabel("Title balls", { exact: true }).textContent(), "3");
  const video = await page.evaluate(async () => {
    const { recorder, chunks } = window.titleDemoRecording;
    await new Promise((resolve) => {
      recorder.onstop = resolve;
      recorder.stop();
    });
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(",")[1]);
      reader.readAsDataURL(new Blob(chunks));
    });
  });
  await writeFile(`${directory}/title-demo.webm`, Buffer.from(video, "base64"));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${directory}/phone-6.png` });
  for (const name of ["Start", "Settings"]) {
    const box = await page.getByRole("button", { name, exact: true }).boundingBox();
    assert.ok(box.x >= 0 && box.y >= 0 && box.x + box.width <= 390 && box.y + box.height <= 844);
  }
  assert.equal(
    await page.evaluate(() => localStorage.getItem("citadel.progress.v1")),
    savedProgress,
  );
  assert.equal(await page.getByLabel("Title damage", { exact: true }).textContent(), "0");
  assert.deepEqual(errors, []);
  await writeFile(
    `${directory}/report.json`,
    JSON.stringify({ renderer, samples, errors, progressUnchanged: true }, null, 2) + "\n",
  );
  console.log(JSON.stringify({ directory, renderer, errors }));
} finally {
  await browser.close();
}
