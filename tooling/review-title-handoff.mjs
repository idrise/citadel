import { installVirtualBrowserControls } from "../tests/virtual-input.ts";
import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";

const origin = process.argv[2] ?? "http://127.0.0.1:5188";
const directory = process.argv[3] ?? "artifacts/reviews/title-handoff";
await mkdir(directory, { recursive: true });
const browser = await chromium.launch({ channel: "chromium" });
const errors = [];
async function open() {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(installVirtualBrowserControls);
  return page;
}
async function configure(page, count) {
  await page.evaluate((count) => {
    window.__citadelTestInput.session.configure({ music: false, effectsVolume: 0 });
    window.__citadelTestInput.session.roster(count, 0);
  }, count);
}
try {
  let page = await open();
  await page.clock.install();
  await page.goto(`${origin}/?seed=2026`);
  await page.getByRole("button", { name: "Start", exact: true }).waitFor();
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
  for (const count of [2, 4]) {
    await configure(page, count);
    await page.clock.runFor(2500);
    await page.screenshot({ path: `${directory}/desktop-${count}-before.png` });
    await page.getByRole("button", { name: "Start", exact: true }).click();
    for (const [step, label] of [
      [140, "lift"],
      [180, "recentre"],
      [600, "settled"],
    ]) {
      await page.clock.runFor(step);
      await page.screenshot({ path: `${directory}/desktop-${count}-${label}.png` });
    }
    await page.evaluate(() => window.__citadelTestInput.session.restart());
    await page.clock.runFor(1600);
  }
  await page.close();
  page = await open();
  await page.goto(`${origin}/?seed=2026`);
  await page.getByRole("button", { name: "Start", exact: true }).waitFor();
  await configure(page, 6);
  await page.waitForTimeout(19000);
  assert.equal(await page.getByLabel("Title balls", { exact: true }).textContent(), "3");
  const progress = await page.evaluate(() => localStorage.getItem("citadel.progress.v1"));
  const renderer = await page.evaluate(() => {
    const gl = document.querySelector("canvas").getContext("webgl2");
    const extension = gl.getExtension("WEBGL_debug_renderer_info");
    return extension
      ? gl.getParameter(extension.UNMASKED_RENDERER_WEBGL)
      : gl.getParameter(gl.RENDERER);
  });
  await page.screenshot({ path: `${directory}/desktop-6-before.png` });
  await page.evaluate(() => {
    const recorder = new MediaRecorder(document.querySelector("canvas").captureStream(60), {
      mimeType: "video/webm;codecs=vp9",
      videoBitsPerSecond: 4000000,
    });
    const chunks = [];
    recorder.ondataavailable = (event) => chunks.push(event.data);
    recorder.start();
    window.handoffRecording = { recorder, chunks };
  });
  await page.waitForTimeout(500);
  await page.getByRole("button", { name: "Start", exact: true }).click();
  await page.waitForTimeout(140);
  await page.screenshot({ path: `${directory}/desktop-6-lift.png` });
  await page.waitForTimeout(140);
  await page.screenshot({ path: `${directory}/desktop-6-recentre.png` });
  await page.waitForTimeout(650);
  await page.screenshot({ path: `${directory}/desktop-6-settled.png` });
  await page.waitForTimeout(500);
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Restart", exact: true }).click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${directory}/restart-midpoint.png` });
  await page.waitForTimeout(1200);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(700);
  await page.getByRole("button", { name: "Start", exact: true }).click();
  await page.waitForTimeout(180);
  await page.screenshot({ path: `${directory}/phone-lift.png` });
  await page.waitForTimeout(1100);
  await page.screenshot({ path: `${directory}/phone-settled.png` });
  const video = await page.evaluate(async () => {
    const { recorder, chunks } = window.handoffRecording;
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
  await writeFile(`${directory}/handoff.webm`, Buffer.from(video, "base64"));
  assert.equal(await page.evaluate(() => localStorage.getItem("citadel.progress.v1")), progress);
  assert.deepEqual(errors, []);
  await writeFile(
    `${directory}/report.json`,
    JSON.stringify({ renderer, errors, progressUnchanged: true }, null, 2) + "\n",
  );
  console.log(JSON.stringify({ directory, renderer, errors }));
} finally {
  await browser.close();
}
