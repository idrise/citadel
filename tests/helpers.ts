import { expect, type Page } from "@playwright/test";

export async function openGame(page: Page, reduced = true, seed = 2026) {
  await page.clock.install();
  await page.goto(`./?seed=${seed}`);
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 60000));
  if (reduced) {
    await openSettings(page);
    await page.getByRole("checkbox", { name: "Reduced effects" }).check();
    await page.getByRole("button", { name: "Resume", exact: true }).click();
  }
}
export async function openSettings(page: Page) {
  if (!(await page.locator(".menu-panel").isVisible()))
    await page.getByRole("button", { name: "Settings", exact: true }).click();
  const details = page.locator(".settings-menu");
  if ((await details.getAttribute("open")) === null) await details.locator("summary").click();
}
export async function choosePlayers(page: Page, count: number) {
  if (await page.locator(".menu-panel").isVisible())
    await page.getByRole("button", { name: "Resume", exact: true }).click();
  const current = Number(await page.getByLabel("Player count", { exact: true }).textContent());
  for (let n = current; n !== count; n += Math.sign(count - current))
    await page
      .getByRole("button", {
        name: count > current ? "Increase players" : "Decrease players",
        exact: true,
      })
      .click();
  await expect(page.getByLabel("Player count", { exact: true })).toHaveText(String(count));
}
export async function play(page: Page) {
  if (await page.locator(".menu-panel").isVisible())
    await page.getByRole("button", { name: "Resume", exact: true }).click();
  if (!(await page.evaluate(() => Boolean(document.pointerLockElement))))
    await page.getByRole("button", { name: "Start", exact: true }).click();
  await expect.poll(() => page.evaluate(() => document.pointerLockElement?.tagName)).toBe("CANVAS");
}
export async function pause(page: Page) {
  await page.keyboard.press("Escape");
  await expect(page.getByRole("heading", { name: "Paused", exact: true })).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.pointerLockElement === null)).toBe(true);
}
