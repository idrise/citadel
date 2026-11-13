import { expect, test } from "./fixtures";
import { openGame, choosePlayers, finishIntroduction } from "./helpers";
const progressKey = "citadel.progress.v1";
test("plus and minus preview frozen levels on the same canvas, never saving debug results, and Backspace restores progress", async ({
  page,
}, testInfo) => {
  await openGame(page);
  await choosePlayers(page, 2);
  const canvas = await page.locator("canvas").elementHandle();
  const saved = await page.evaluate((key) => localStorage.getItem(key), progressKey);
  await page.keyboard.press("+");
  await expect(page.getByLabel("Round level", { exact: true })).toHaveText("2");
  await expect(page.getByLabel("Debug mode", { exact: true })).toHaveText(
    "Debug - progress not saved",
  );
  await expect(page.getByLabel("Round phase", { exact: true })).toHaveText("countdown");
  await page.keyboard.press("-");
  await expect(page.getByLabel("Round level", { exact: true })).toHaveText("1");
  await page.clock.runFor(500);
  await page.screenshot({ path: testInfo.outputPath("debug-level-01.png") });
  await finishIntroduction(page);
  for (
    let seconds = 0;
    seconds < 120 &&
    (await page.getByLabel("Round phase", { exact: true }).textContent()) !== "finished";
    seconds++
  )
    await page.clock.runFor(1000);
  await expect(page.getByLabel("Round phase", { exact: true })).toHaveText("finished");
  expect(await page.evaluate((key) => localStorage.getItem(key), progressKey)).toBe(saved);
  await page.keyboard.press("Backspace");
  await expect(page.getByLabel("Debug mode", { exact: true })).toHaveText("Off");
  await expect(page.getByLabel("Round level", { exact: true })).toHaveText("1");
  await expect(page.getByRole("button", { name: "Start", exact: true })).toBeVisible();
  expect(await canvas!.evaluate((node) => node.isConnected)).toBe(true);
  expect(await page.evaluate((key) => localStorage.getItem(key), progressKey)).toBe(saved);
});
test("debug keys do not alter preferences and show shape changes before play", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openGame(page, false);
  const before = await page.evaluate(() => localStorage.getItem("citadel.solo.v1"));
  for (let level = 2; level <= 10; level++) await page.keyboard.press("+");
  await expect(page.getByLabel("Round level", { exact: true })).toHaveText("10");
  await expect(page.getByLabel("Level changes", { exact: true })).toHaveText("WIDE ARENA");
  await page.clock.runFor(600);
  await page.screenshot({ path: testInfo.outputPath("debug-level-10-phone.png") });
  expect(await page.evaluate(() => localStorage.getItem("citadel.solo.v1"))).toBe(before);
  expect(await page.getByLabel("Ball 0 phase", { exact: true }).textContent()).toBe("ready");
});
