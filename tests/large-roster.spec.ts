import { expect, test } from "./fixtures";
import {
  openGame,
  choosePlayers,
  configureGame,
  selectFortress,
  play,
  finishIntroduction,
  pause,
  saveLevel,
} from "./helpers";
for (const count of [8, 12, 16])
  test(`${count} players retain playable controls, stable input and layout feedback`, async ({
    page,
  }, testInfo) => {
    test.setTimeout(120000);
    await page.setViewportSize({ width: 960, height: 720 });
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await openGame(page);
    await configureGame(page, { music: false, effectsVolume: 0 });
    await choosePlayers(page, count);
    await selectFortress(page, count - 1);
    const canvas = await page.locator("canvas").elementHandle();
    await play(page);
    await finishIntroduction(page);
    await page.keyboard.down("KeyD");
    await page.clock.runFor(150);
    await page.keyboard.up("KeyD");
    await pause(page);
    const angle = await page.getByLabel("Bat angle", { exact: true }).textContent();
    await page.clock.runFor(300);
    expect(await page.getByLabel("Bat angle", { exact: true }).textContent()).toBe(angle);
    await page.screenshot({ path: testInfo.outputPath(`paused-${count}.png`) });
    await page.getByRole("button", { name: "Resume", exact: true }).click();
    await page.keyboard.press("+");
    await expect(page.getByLabel("Round level", { exact: true })).toHaveText("2");
    await expect(page.getByLabel("Level changes", { exact: true })).toHaveText("WIDE ARENA");
    await page.clock.runFor(600);
    await page.screenshot({ path: testInfo.outputPath(`wide-${count}.png`) });
    expect(await canvas!.evaluate((node) => node.isConnected)).toBe(true);
    expect(errors).toEqual([]);
  });
test.describe("sixteen-player mobile", () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });
  test("runs the sixteen-ball debug finale, rotates, pauses and restores settings", async ({
    page,
  }, testInfo) => {
    test.setTimeout(120000);
    await saveLevel(page, 100, 16);
    await openGame(page, false);
    await configureGame(page, { music: false, effectsVolume: 0 });
    await choosePlayers(page, 16);
    await page.getByRole("button", { name: "Settings", exact: true }).tap();
    await page.getByRole("button", { name: "Resume", exact: true }).tap();
    await page.keyboard.press("+");
    await expect(page.getByLabel("Round level", { exact: true })).toHaveText("100");
    await page.getByRole("button", { name: "Pause", exact: true }).tap();
    await expect(page.getByLabel("Mouse sensitivity", { exact: true })).toBeHidden();
    await page.getByRole("button", { name: "Resume", exact: true }).tap();
    await finishIntroduction(page);
    await page.clock.runFor(1200);
    await page.screenshot({ path: testInfo.outputPath("sixteen-phone.png") });
    await page.setViewportSize({ width: 844, height: 390 });
    await page.clock.runFor(100);
    await page.getByRole("button", { name: "Pause", exact: true }).tap();
    await expect(page.getByLabel("Round ball limit", { exact: true })).toHaveText("16");
    await page.screenshot({ path: testInfo.outputPath("sixteen-landscape.png") });
    expect(await page.locator("canvas").count()).toBe(1);
  });
});
