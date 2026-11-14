import { expect, test } from "./fixtures";
import { choosePlayers, finishIntroduction, openGame, pause, saveLevel } from "./helpers";

test("announces the actual profile changes on debug level starts and preserves saved progress", async ({
  page,
}, testInfo) => {
  await saveLevel(page, 5, 6);
  await openGame(page);
  await choosePlayers(page, 6);
  const progress = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("citadel.progress.v1")!),
  );
  await page.locator("canvas").evaluate((node) => node.setAttribute("data-profile-review", "same"));
  await page.keyboard.press("+");
  await expect(page.getByLabel("Round level", { exact: true })).toHaveText("6");
  await expect(page.getByLabel("Level changes", { exact: true })).toContainText("SHALLOW BAT");
  await page.clock.runFor(450);
  await expect(page.getByLabel("Ball 0 phase", { exact: true })).toHaveText("ready");
  await page.screenshot({ path: testInfo.outputPath("shallow-bat-intro.png") });
  await finishIntroduction(page);
  await pause(page);
  for (let level = 7; level <= 11; level++) await page.keyboard.press("+");
  await expect(page.getByLabel("Round level", { exact: true })).toHaveText("11");
  await expect(page.getByLabel("Level changes", { exact: true })).toContainText("DEEPER BAT");
  await expect(page.locator("canvas")).toHaveAttribute("data-profile-review", "same");
  await page.clock.runFor(450);
  await page.screenshot({ path: testInfo.outputPath("deeper-bat-intro.png") });
  await page.keyboard.press("Backspace");
  await expect(page.getByRole("button", { name: "Start", exact: true })).toBeVisible();
  await expect(page.getByLabel("Round level", { exact: true })).toHaveText("5");
  expect(
    await page.evaluate(() => JSON.parse(localStorage.getItem("citadel.progress.v1")!)),
  ).toEqual(progress);
});
