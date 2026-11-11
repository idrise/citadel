import { expect, type Page } from "@playwright/test";

export async function openGame(page: Page, reduced = true) {
  await page.clock.install();
  await page.goto("./");
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 60000));
  if (reduced) {
    await page.getByText("Settings", { exact: true }).click();
    await page.getByRole("checkbox", { name: "Reduced effects" }).check();
    await page.getByText("Settings", { exact: true }).click();
  }
}
export async function play(page: Page) {
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expect.poll(() => page.evaluate(() => document.pointerLockElement?.tagName)).toBe("CANVAS");
}
export async function pause(page: Page) {
  await page.keyboard.press("Escape");
  await expect(page.getByRole("heading", { name: "Paused", exact: true })).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.pointerLockElement === null)).toBe(true);
}
