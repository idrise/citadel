import { expect, test } from "./fixtures";
import { openGame, openSettings, play, finishIntroduction, pause } from "./helpers";
test("settings render Resume, Restart and the three desktop sliders, persisting real changes", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await openGame(page, false);
  const canvas = await page.locator("canvas").elementHandle();
  await openSettings(page);
  await expect(page.locator(".menu-panel,.touch-hint,.title-display,.enable-sound")).toHaveCount(0);
  const panel = page.getByRole("navigation", { name: "Game settings", exact: true });
  await expect(panel.getByRole("button")).toHaveCount(2);
  await expect(panel.getByRole("slider")).toHaveCount(3);
  await page.getByLabel("Sound effects volume", { exact: true }).fill("0.8");
  await page.getByLabel("Music volume", { exact: true }).fill("0");
  await page.getByLabel("Mouse sensitivity", { exact: true }).fill("1.4");
  await page.screenshot({ path: testInfo.outputPath("desktop-settings.png") });
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await play(page);
  await finishIntroduction(page);
  await pause(page);
  const stats = await page.locator(".diagnostics").textContent();
  await page.clock.runFor(500);
  expect(await page.locator(".diagnostics").textContent()).toBe(stats);
  expect(await canvas!.evaluate((node) => node.isConnected)).toBe(true);
  await page.reload();
  await openSettings(page);
  await expect(page.getByLabel("Sound effects volume", { exact: true })).toHaveValue("0.8");
  await expect(page.getByLabel("Music volume", { exact: true })).toHaveValue("0");
  await expect(page.getByLabel("Mouse sensitivity", { exact: true })).toHaveValue("1.4");
});
test.describe("touch scene settings", () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });
  test("omits mouse sensitivity and retains reachable controls through rotation", async ({
    page,
  }, testInfo) => {
    await openGame(page, false);
    await page.getByRole("button", { name: "Settings", exact: true }).tap();
    await expect(page.getByLabel("Mouse sensitivity", { exact: true })).toBeHidden();
    await expect(
      page.getByRole("navigation", { name: "Game settings", exact: true }).getByRole("slider"),
    ).toHaveCount(2);
    await page.getByLabel("Music volume", { exact: true }).focus();
    await page.keyboard.press("ArrowLeft");
    await expect(page.getByLabel("Music volume", { exact: true })).toHaveValue("0.44");
    for (const size of [
      { width: 390, height: 844 },
      { width: 844, height: 390 },
    ]) {
      await page.setViewportSize(size);
      await page.clock.runFor(50);
      for (const name of ["Sound effects volume", "Music volume", "Resume", "Restart"]) {
        const control =
          name === "Resume" || name === "Restart"
            ? page.getByRole("button", { name, exact: true })
            : page.getByLabel(name, { exact: true });
        const box = (await control.boundingBox())!;
        expect(box.height).toBeGreaterThanOrEqual(44);
        expect(box.y).toBeGreaterThanOrEqual(0);
        expect(box.y + box.height).toBeLessThanOrEqual(size.height);
      }
      // ResizeObserver can clear the WebGL buffer after the first controlled frame.
      // Draw again after the projected controls have reached their new positions.
      await page.clock.runFor(150);
      await page.screenshot({ path: testInfo.outputPath(`touch-settings-${size.width}.png`) });
    }
    await page.getByRole("button", { name: "Resume", exact: true }).tap();
    await page.getByRole("button", { name: "Start", exact: true }).tap();
    await expect(page.getByRole("button", { name: "Pause", exact: true })).toBeVisible();
  });
});
