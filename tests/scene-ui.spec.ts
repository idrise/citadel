import { expect, test } from "./fixtures";
import { configureGame, choosePlayers, openGame, openSettings, play, pause } from "./helpers";

test("the procedural title uses bounded 3D count controls and keyboard Start, with settings confined to pause", async ({
  page,
}, testInfo) => {
  test.setTimeout(120000);
  await page.setViewportSize({ width: 1280, height: 900 });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await openGame(page, false);
  await expect(page.locator(".menu-panel")).toHaveCount(0);
  const buttons = ["Start", "Decrease players", "Increase players", "Settings"];
  const original = await Promise.all(
    buttons.map((name) => page.getByRole("button", { name, exact: true }).boundingBox()),
  );
  const expectAnchored = async () => {
    const current = await Promise.all(
      buttons.map((name) => page.getByRole("button", { name, exact: true }).boundingBox()),
    );
    expect(current).toEqual(original);
  };
  await page.screenshot({ path: testInfo.outputPath("title-4.png") });
  await choosePlayers(page, 2);
  await expectAnchored();
  await expect(page.getByRole("button", { name: "Decrease players", exact: true })).toBeDisabled();
  await page.screenshot({ path: testInfo.outputPath("title-2.png") });
  for (const count of [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]) {
    await choosePlayers(page, count);
    await expectAnchored();
  }
  await page.clock.runFor(800);
  await expectAnchored();
  await expect(page.getByRole("button", { name: "Increase players", exact: true })).toBeDisabled();
  await page.screenshot({ path: testInfo.outputPath("title-16.png") });
  await page.getByRole("button", { name: "Start", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect.poll(() => page.evaluate(() => Boolean(document.pointerLockElement))).toBe(true);
  await expect(page.locator(".scene-controls")).toBeHidden();
  await page.clock.runFor(200);
  await pause(page);
  await openSettings(page);
  await expect(page.getByLabel("Sound effects volume", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await expect(page.locator(".menu-panel")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("a real human win keeps the arena alive for neon fireworks and scene rematch without a popup", async ({
  page,
}, testInfo) => {
  test.setTimeout(240000);
  await page.setViewportSize({ width: 800, height: 600 });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await openGame(page, false);
  await choosePlayers(page, 2);
  await openSettings(page);
  await configureGame(page, { music: false, effectsVolume: 0 });
  // Keep full motion/fireworks, but bound the controlled-clock render cost.
  await configureGame(page, { effectsQuality: "low" });
  await play(page);
  const owners = new Set<string>();
  for (
    let seconds = 0;
    seconds < 120 &&
    (await page.getByLabel("Round phase", { exact: true }).textContent()) !== "finished";
    seconds += 1
  ) {
    await page.clock.runFor(1000);
    const owner = (await page.getByLabel("Ball 0 owner", { exact: true }).allTextContents())[0];
    if (owner) owners.add(owner);
  }
  await expect(page.getByLabel("Round winner", { exact: true })).toHaveText("You win");
  await expect(page.locator(".menu-panel,.game-overlay")).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => document.pointerLockElement === null)).toBe(true);
  expect(owners.has("Coral")).toBe(true);
  expect(owners.has("Amber")).toBe(true);
  const rematch = page.getByRole("button", {
    name: /^(Next level|Retry|Play again)$/,
    exact: true,
  });
  await expect(rematch).toBeHidden();
  const stats = await page.locator(".diagnostics").textContent();
  const before = await page.screenshot({ path: testInfo.outputPath("victory-early.png") });
  await page.clock.runFor(1100);
  const after = await page.screenshot({ path: testInfo.outputPath("victory-fireworks.png") });
  expect(before.equals(after)).toBe(false);
  expect(await page.locator(".diagnostics").textContent()).toBe(stats);
  await expect(rematch).toBeVisible();
  await page.clock.runFor(2100);
  await page.screenshot({ path: testInfo.outputPath("victory-star-hold.png") });
  await expect(rematch).toBeVisible();
  expect(await page.locator(".diagnostics").textContent()).toBe(stats);
  await page.clock.runFor(1400);
  await expect(rematch).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("victory-readable-low.png") });
  await openSettings(page);
  await configureGame(page, { effectsQuality: "high" });
  await page.clock.runFor(400);
  expect(await page.locator(".diagnostics").textContent()).toBe(stats);
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await expect.poll(() => page.evaluate(() => document.pointerLockElement === null)).toBe(true);
  await expect(rematch).toBeVisible();
  await page.clock.runFor(50);
  await page.screenshot({ path: testInfo.outputPath("victory-readable-high.png") });
  await rematch.click();
  await expect(page.getByRole("button", { name: "Start", exact: true })).toBeHidden();
  await expect(page.getByLabel("Round phase", { exact: true })).toHaveText("countdown");
  await expect(page.getByLabel("Player count", { exact: true })).toHaveText("2");
  expect(errors).toEqual([]);
});
