import { expect, test } from "@playwright/test";
import { choosePlayers, openGame, openSettings, play } from "./helpers";
test("an eliminated player can watch live bots or retry immediately on the same canvas", async ({
  page,
}, testInfo) => {
  test.setTimeout(120000);
  await openGame(page, true, 8);
  await choosePlayers(page, 6);
  await openSettings(page);
  await page.getByRole("checkbox", { name: "Music", exact: true }).uncheck();
  await play(page);
  await page.keyboard.down("KeyD");
  await page.clock.runFor(67000);
  await page.keyboard.up("KeyD");
  await expect(page.getByLabel("Coral health", { exact: true })).toHaveText("0");
  await expect(page.getByLabel("Round phase", { exact: true })).toHaveText("playing");
  await expect.poll(() => page.evaluate(() => Boolean(document.pointerLockElement))).toBe(false);
  await expect(page.getByRole("button", { name: "Retry level 1", exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("early-loss.png") });
  const rounds = await page.evaluate(
    () => JSON.parse(localStorage.getItem("citadel.progress.v1")!).rounds,
  );
  await page.getByRole("button", { name: "Watch", exact: true }).click();
  const before = await page.locator(".diagnostics").textContent();
  await page.clock.runFor(2000);
  expect(await page.locator(".diagnostics").textContent()).not.toBe(before);
  await expect(page.getByRole("button", { name: "Watch", exact: true })).toBeHidden();
  expect(
    await page.evaluate(() => JSON.parse(localStorage.getItem("citadel.progress.v1")!).rounds),
  ).toBe(rounds);
  await page.locator("canvas").evaluate((canvas) => canvas.setAttribute("data-retry", "same"));
  await page.getByRole("button", { name: "Retry level 1", exact: true }).click();
  await expect(page.getByLabel("Round phase", { exact: true })).toHaveText("countdown");
  await expect(page.getByRole("button", { name: "Start", exact: true })).toBeHidden();
  await expect(page.locator("canvas")).toHaveAttribute("data-retry", "same");
  await expect.poll(() => page.evaluate(() => Boolean(document.pointerLockElement))).toBe(true);
});
