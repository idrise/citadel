import { expect, test } from "@playwright/test";

test("keyboard, focus-loss pause, timed second ball and restart work in the production game", async ({
  page,
}, testInfo) => {
  await page.clock.install();
  await page.goto("./");
  await page.getByRole("button", { name: "Play vs Bots" }).click();
  await page.clock.runFor(1800);
  await expect(page.locator(".countdown")).toHaveCount(0);
  await page.keyboard.down("KeyD");
  await page.clock.runFor(150);
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  await expect(page.getByRole("heading", { name: "Paused", exact: true })).toBeVisible();
  const pausedText = await page.locator(".diagnostics").textContent();
  await page.clock.runFor(1000);
  expect(await page.locator(".diagnostics").textContent()).toBe(pausedText);
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await page.keyboard.up("KeyD");
  await page.clock.runFor(15500);
  await expect(page.locator(".pressure-bar")).toContainText("2 BALLS");
  await page.screenshot({ path: testInfo.outputPath("m01-gameplay.png"), fullPage: true });
  await page.getByRole("button", { name: "Restart", exact: true }).click();
  await expect(page.getByRole("button", { name: "Play vs Bots" })).toBeVisible();
  await expect(page.locator(".pressure-bar")).toContainText("1 BALL");
  await expect(page.locator("canvas")).toHaveCount(1);
  await expect(page.locator('.health-pieces[aria-label$="8 pieces"]')).toHaveCount(4);
});

test("a full seeded round reaches results and rematches without a state-editing shortcut", async ({
  page,
}, testInfo) => {
  test.setTimeout(180000);
  await page.clock.install();
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("./");
  await page.getByRole("button", { name: "Play vs Bots" }).click();
  await page.clock.runFor(33000);
  await expect(page.locator(".pressure-bar")).toContainText("3 BALLS");
  await page.screenshot({ path: testInfo.outputPath("m01-three-balls.png"), fullPage: true });
  const rematch = page.getByRole("button", { name: "Rematch", exact: true });
  for (let elapsed = 33; elapsed < 240 && !(await rematch.isVisible()); elapsed += 15)
    await page.clock.runFor(15000);
  await expect(rematch).toBeVisible();
  await expect(page.getByRole("heading", { name: /wins\.|You survived\./ })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("m01-result.png"), fullPage: true });
  await rematch.click();
  await expect(page.getByRole("button", { name: "Play vs Bots" })).toBeVisible();
  await expect(page.locator(".pressure-bar")).toContainText("1 BALL");
  expect(errors).toEqual([]);
});
