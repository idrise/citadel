import { expect, test } from "@playwright/test";
import { openGame, play, pause, openSettings } from "./helpers";

async function settings(page: import("@playwright/test").Page) {
  await openSettings(page);
}

test("a mouse flick reaches the requested bat position within 50ms", async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 600 });
  await openGame(page);
  await play(page);
  await page.mouse.move(0, 300);
  await page.clock.runFor(150);
  const before = Number(await page.getByLabel("Bat angle", { exact: true }).textContent());
  await page.mouse.move(100, 300);
  await page.clock.runFor(50);
  // Pause reports the actual 50ms state; the normal accessible status is sampled every 80ms.
  await pause(page);
  const after = Number(await page.getByLabel("Bat angle", { exact: true }).textContent());
  expect(after - before).toBeGreaterThan(28);
  expect(after - before).toBeLessThan(30);
});

test("aid modes and sensitivity survive restart and every human fortress", async ({ page }) => {
  test.setTimeout(180000);
  await page.setViewportSize({ width: 800, height: 600 });
  await openGame(page);
  await settings(page);
  for (const mode of ["none", "preview", "slowdown", "both"]) {
    await page.getByLabel("Aiming assistance", { exact: true }).selectOption(mode);
    await expect(page.getByLabel("Aiming assistance", { exact: true })).toHaveValue(mode);
  }
  await page.getByLabel("Mouse sensitivity", { exact: true }).focus();
  for (let step = 0; step < 6; step++) await page.keyboard.press("ArrowRight");
  for (const seat of ["1", "2", "3", "0"]) {
    await page.getByLabel("Your fortress", { exact: true }).selectOption(seat);
    await settings(page);
    await expect(page.getByLabel("Aiming assistance", { exact: true })).toHaveValue("both");
    await expect(page.getByLabel("Mouse sensitivity", { exact: true })).toHaveValue("1.6");
    await expect(page.getByRole("checkbox", { name: "Reduced effects" })).toBeChecked();
    await openSettings(page);
    await play(page);
    await page.mouse.move(790, 300);
    await page.clock.runFor(300);
    const angle = Number(await page.getByLabel("Bat angle", { exact: true }).textContent());
    const base = [-45, -135, 135, 45][Number(seat)]!;
    expect(angle - base).toBeGreaterThan(28.5);
    expect(angle - base).toBeLessThan(29.6);
    await pause(page);
    await settings(page);
  }
  await page.getByRole("button", { name: "Restart", exact: true }).click();
  await settings(page);
  await expect(page.getByLabel("Aiming assistance", { exact: true })).toHaveValue("both");
  await expect(page.getByLabel("Mouse sensitivity", { exact: true })).toHaveValue("1.6");
});

test("restart repeats the same opening and resize does not steer captured input", async ({
  page,
}) => {
  test.setTimeout(120000);
  await page.setViewportSize({ width: 800, height: 600 });
  await openGame(page);
  const opening = await page.locator(".diagnostics").textContent();
  await play(page);
  await page.clock.runFor(1800);
  await page.mouse.move(430, 300);
  await page.clock.runFor(300);
  const angle = await page.getByLabel("Bat angle", { exact: true }).textContent();
  await page.setViewportSize({ width: 1000, height: 650 });
  await page.clock.runFor(250);
  expect(await page.getByLabel("Bat angle", { exact: true }).textContent()).toBe(angle);
  await pause(page);
  await page.getByRole("button", { name: "Restart", exact: true }).click();
  expect(await page.locator(".diagnostics").textContent()).toBe(opening);
  await expect(page.getByRole("button", { name: "Start", exact: true })).toBeVisible();
});
