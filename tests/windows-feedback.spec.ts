import { expect, test } from "./fixtures";
import { openGame, openSettings, play, finishIntroduction, pause, saveLevel } from "./helpers";
test("guide defaults off, persists an explicit serve-only choice and desktop Pause stays hidden", async ({
  page,
}, info) => {
  await openGame(page, false);
  await openSettings(page);
  await expect(page.getByRole("button", { name: "Ball guide: Off", exact: true })).toHaveAttribute(
    "aria-pressed",
    "false",
  );
  await page.getByRole("button", { name: "Ball guide: Off", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Ball guide: Serve direction only", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.screenshot({ path: info.outputPath("desktop-settings-guide.png") });
  await page.reload();
  await openSettings(page);
  await expect(
    page.getByRole("button", { name: "Ball guide: Serve direction only", exact: true }),
  ).toBeVisible();
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
  await expect(page.getByLabel("Highest achieved level", { exact: true })).toHaveText("7");
  const before = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("citadel.progress.v1")!),
  );
  await page.keyboard.press("+");
  await expect(page.getByLabel("Round level", { exact: true })).toHaveText("8");
  await expect(page.getByLabel("Highest achieved level", { exact: true })).toHaveText("7");
  expect(
    await page.evaluate(() => JSON.parse(localStorage.getItem("citadel.progress.v1")!)),
  ).toEqual(before);
  await page.screenshot({ path: info.outputPath("desktop-debug-best.png") });
  await page.keyboard.press("Backspace");
});
test.describe("touch playtest status", () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });
  test("labels Pause and retains guide/status layout through rotation", async ({ page }, info) => {
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
      const guide = page.getByRole("button", { name: "Ball guide: Off", exact: true }),
        box = (await guide.boundingBox())!;
      expect(box.height).toBeGreaterThanOrEqual(44);
      expect(box.y).toBeGreaterThanOrEqual(0);
      expect(box.y + box.height).toBeLessThan(size.height);
      await page.screenshot({ path: info.outputPath(`touch-settings-${size.width}.png`) });
    }
  });
});
