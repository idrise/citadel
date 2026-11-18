import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { installVirtualBrowserControls } from "../tests/virtual-input.ts";
const origin = process.argv.find((arg) => arg.startsWith("http")) ?? "http://127.0.0.1:5181";
const directory = "docs/reviews/m09/todo-followup";
await mkdir(directory, { recursive: true });
const browser = await chromium.launch({ channel: "chromium" });
const errors = [],
  samples = [];
try {
  for (const { name, size, touch } of [
    { name: "desktop", size: { width: 1280, height: 900 }, touch: false },
    { name: "phone", size: { width: 390, height: 844 }, touch: true },
    { name: "tablet", size: { width: 768, height: 1024 }, touch: true },
    { name: "landscape", size: { width: 568, height: 320 }, touch: true },
    { name: "square", size: { width: 320, height: 320 }, touch: false },
  ]) {
    const page = await browser.newPage({ viewport: size, hasTouch: touch, isMobile: touch });
    page.on("pageerror", (e) => errors.push(e.message));
    await page.addInitScript(installVirtualBrowserControls);
    await page.clock.install();
    await page.goto(`${origin}/?seed=2026`);
    await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
    for (const count of name === "desktop" || name === "phone" ? [2, 4, 6] : [6]) {
      await page.evaluate((count) => window.__citadelTestInput.session.roster(count, 0), count);
      await page.clock.runFor(1200);
      const settings = page.getByRole("button", { name: "Settings", exact: true });
      if (touch) await settings.tap();
      else await settings.click();
      await page.clock.runFor(200);
      assert.equal(await page.getByRole("button", { name: /Ball guide/ }).count(), 0);
      const resume = await page.getByRole("button", { name: "Resume", exact: true }).boundingBox();
      const restart = await page
        .getByRole("button", { name: "Restart", exact: true })
        .boundingBox();
      assert.equal(resume.y, restart.y);
      assert.equal(resume.width, restart.width);
      assert(resume.x + resume.width + 11.9 < restart.x);
      await page.screenshot({ path: `${directory}/${name}-${count}.png` });
      samples.push({ name, count, ...size, touch, resume, restart });
      assert.equal(await page.getByLabel("Mouse sensitivity", { exact: true }).isVisible(), !touch);
      const resumeButton = page.getByRole("button", { name: "Resume", exact: true });
      if (touch) await resumeButton.tap();
      else await resumeButton.click();
    }
    await page.close();
  }
  if (!process.argv.includes("--screens-only")) {
    // A real scene/session capture with the normal fixed clock and page-local input.
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      recordVideo: { dir: `${directory}/video`, size: { width: 1280, height: 720 } },
    });
    await context.addInitScript(installVirtualBrowserControls);
    const page = await context.newPage();
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(`${origin}/?seed=2026`);
    await page.evaluate(() => window.__citadelTestInput.session.roster(6, 0));
    await page.getByRole("button", { name: "Start", exact: true }).click();
    for (let i = 0; i < 16; i++) {
      await page.evaluate((i) => {
        window.__citadelTestInput.move(180 * Math.sin(i / 2), 0);
        window.__citadelTestInput.click();
      }, i);
      await page.waitForTimeout(1000);
    }
    const video = page.video();
    await context.close();
    await video.saveAs(`${directory}/gameplay.webm`);
    await video.delete();
  }
  assert.deepEqual(errors, []);
  await writeFile(
    `${directory}/settings-report.json`,
    JSON.stringify({ samples, errors }, null, 2) + "\n",
  );
  console.log({ samples: samples.length, errors });
} finally {
  await browser.close();
}
