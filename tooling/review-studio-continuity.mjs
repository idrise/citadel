import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { installVirtualBrowserControls } from "../tests/virtual-input.ts";
const browser = await chromium.launch({ channel: "chromium" });
try {
  const page = await browser.newPage({ viewport: { width: 1000, height: 800 } });
  await page.addInitScript(installVirtualBrowserControls);
  await page.clock.install();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await page.goto("http://127.0.0.1:5177/morph.html");
  await page.waitForFunction(() => window.__morphStudio);
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
  const canvas = await page.locator("canvas").elementHandle();
  await page.clock.runFor(5000);
  const first = await page.evaluate(() => window.__morphStudio.snapshot);
  await page.clock.runFor(5000);
  const held = await page.evaluate(() => window.__morphStudio.snapshot);
  assert.deepEqual(held, first);
  assert.equal(await page.locator("#play").textContent(), "Replay");
  const samples = [];
  for (const name of ["3-2", "victory", "next"]) {
    await page.locator(`[data-scenario="${name}"]`).click();
    assert.equal(await canvas.evaluate((node) => node === document.querySelector("canvas")), true);
    const preparing = await page.evaluate(() => window.__morphStudio.snapshot);
    assert(preparing.preparing || preparing.moving);
    await page.clock.runFor(8000);
    const final = await page.evaluate(() => window.__morphStudio.snapshot);
    assert.equal(final.preparing, undefined);
    assert.equal(final.scenario, name);
    assert.equal(await canvas.evaluate((node) => node === document.querySelector("canvas")), true);
    assert.equal(await page.locator("#play").textContent(), "Replay");
    samples.push({ name, preparing, final });
  }
  assert.deepEqual(errors, []);
  await writeFile(
    "artifacts/reviews/morph-studio/studio-continuity.json",
    JSON.stringify({ first, held, samples, errors }, null, 2) + "\n",
  );
  console.log({ held: true, scenarios: samples.length, sameCanvas: true, errors });
} finally {
  await browser.close();
}
