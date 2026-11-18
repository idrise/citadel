import { expect, test } from "./fixtures";
import { openGame, openSettings, play, finishIntroduction, pause, saveLevel } from "./helpers";
test("retired guide choices are ignored and desktop Pause stays hidden", async ({ page }, info) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      "citadel.solo.v1",
      JSON.stringify({ version: 1, count: 4, humanSeat: 0, settings: { serveGuide: true } }),
    ),
  );
  await openGame(page, false);
  await openSettings(page);
  await expect(page.getByRole("button", { name: /Ball guide/ })).toHaveCount(0);
  await page.screenshot({ path: info.outputPath("desktop-settings.png") });
  await page.reload();
  await openSettings(page);
  await expect(page.getByRole("button", { name: /Ball guide/ })).toHaveCount(0);
  await play(page);
  await finishIntroduction(page);
  await expect(page.getByRole("button", { name: "Pause", exact: true })).toBeHidden();
  await page.screenshot({ path: info.outputPath("desktop-current-level.png") });
  await pause(page);
});
test("current/best status migrates older progress and debug navigation cannot raise the saved peak", async ({
  page,
}, info) => {
  await saveLevel(page, 7, 4);
  await openGame(page, false);
  await expect(page.getByLabel("Highest won level", { exact: true })).toHaveText("6");
  const before = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("citadel.progress.v1")!),
  );
  await page.keyboard.press("+");
  await expect(page.getByLabel("Round level", { exact: true })).toHaveText("8");
  await expect(page.getByLabel("Highest won level", { exact: true })).toHaveText("6");
  expect(
    await page.evaluate(() => JSON.parse(localStorage.getItem("citadel.progress.v1")!)),
  ).toEqual(before);
  await page.screenshot({ path: info.outputPath("desktop-debug-best.png") });
  await page.keyboard.press("Backspace");
});
test.describe("touch playtest status", () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });
  test("labels Pause and retains settings layout through rotation", async ({ page }, info) => {
    await openGame(page, false);
    await page.getByRole("button", { name: "Start", exact: true }).tap();
    await finishIntroduction(page);
    await expect(page.getByRole("button", { name: "Pause", exact: true })).toBeVisible();
    await page.screenshot({ path: info.outputPath("phone-current-level.png") });
    await page.getByRole("button", { name: "Pause", exact: true }).tap();
    for (const size of [
      { width: 390, height: 844 },
      { width: 844, height: 390 },
      { width: 568, height: 320 },
    ]) {
      await page.setViewportSize(size);
      await page.clock.runFor(200);
      await expect(page.getByRole("button", { name: /Ball guide/ })).toHaveCount(0);
      const box = (await page.getByLabel("Sound effects volume", { exact: true }).boundingBox())!;
      expect(box.height).toBeGreaterThanOrEqual(44);
      expect(box.y).toBeGreaterThanOrEqual(0);
      expect(box.y + box.height).toBeLessThan(size.height);
      await page.screenshot({ path: info.outputPath(`touch-settings-${size.width}.png`) });
    }
  });
});
