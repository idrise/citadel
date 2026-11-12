import { expect, test } from "@playwright/test";
import { openGame, play, pause } from "./helpers";

test("captured controls, focus pause, timed balls and restart work", async ({ page }) => {
  test.setTimeout(180000);
  await page.setViewportSize({ width: 480, height: 360 });
  await openGame(page);
  await play(page);
  await page.clock.runFor(1800);
  await expect(page.getByLabel("Round phase", { exact: true })).toHaveText("playing");
  await page.keyboard.down("KeyD");
  await page.clock.runFor(150);
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  await expect(page.getByRole("heading", { name: "Paused", exact: true })).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.pointerLockElement === null)).toBe(true);
  const stats = await page.locator(".diagnostics").textContent();
  const angle = await page.getByLabel("Bat angle", { exact: true }).textContent();
  await page.clock.runFor(1000);
  expect(await page.locator(".diagnostics").textContent()).toBe(stats);
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await expect.poll(() => page.evaluate(() => Boolean(document.pointerLockElement))).toBe(true);
  await page.clock.runFor(200);
  expect(await page.getByLabel("Bat angle", { exact: true }).textContent()).toBe(angle);
  await page.keyboard.up("KeyD");
  await page.clock.runFor(15500);
  await expect(page.getByLabel("Balls in play", { exact: true })).toHaveText("2");
  await pause(page);
  await page.getByRole("button", { name: "Restart", exact: true }).click();
  await expect(page.getByRole("button", { name: "Start", exact: true })).toBeVisible();
  await expect(page.getByLabel("Balls in play", { exact: true })).toHaveText("1");
  for (const seat of ["Coral", "Amber", "Violet", "Rose"])
    await expect(page.getByLabel(`${seat} health`, { exact: true })).toHaveText("3");
});

test("a complete seeded round reaches results and rematches without state edits", async ({
  page,
}, testInfo) => {
  // Full Chromium + software WebGL renders every controlled-clock frame of the round.
  test.setTimeout(300000);
  await page.setViewportSize({ width: 480, height: 360 });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await openGame(page);
  await play(page);
  await page.clock.runFor(33000);
  await expect(page.getByLabel("Balls in play", { exact: true })).toHaveText("3");
  await page.screenshot({ path: testInfo.outputPath("perspective-three-balls.png") });
  const rematch = page.getByRole("button", { name: "Rematch", exact: true });
  for (let elapsed = 33; elapsed < 240 && !(await rematch.isVisible()); elapsed += 15)
    await page.clock.runFor(15000);
  await expect(rematch).toBeVisible();
  await expect(page.locator(".menu-panel")).toHaveCount(0);
  await expect(page.getByLabel("Round phase", { exact: true })).toHaveText("finished");
  await expect.poll(() => page.evaluate(() => document.pointerLockElement === null)).toBe(true);
  await rematch.click();
  await expect(page.getByRole("button", { name: "Start", exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test("relative mouse reaches both banks without depending on screen position", async ({ page }) => {
  test.setTimeout(60000);
  await openGame(page);
  await play(page);
  await page.clock.runFor(1800);
  await page.mouse.move(900, 360);
  await page.clock.runFor(500);
  expect(Number(await page.getByLabel("Bat angle", { exact: true }).textContent())).toBeGreaterThan(
    -20,
  );
  await page.mouse.move(350, 360);
  await page.clock.runFor(500);
  expect(Number(await page.getByLabel("Bat angle", { exact: true }).textContent())).toBeLessThan(
    -70,
  );
  await page.mouse.move(900, 360);
  await page.clock.runFor(500);
  expect(Number(await page.getByLabel("Bat angle", { exact: true }).textContent())).toBeGreaterThan(
    -20,
  );
  await pause(page);
});
