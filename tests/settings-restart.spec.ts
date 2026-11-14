import { expect, test } from "./fixtures";
import {
  choosePlayers,
  configureGame,
  finishIntroduction,
  moveMouse,
  openGame,
  pause,
  play,
  saveLevel,
  selectFortress,
} from "./helpers";

for (const touch of [false, true]) {
  test.describe(touch ? "touch settings restart" : "desktop settings restart", () => {
    test.use({
      hasTouch: touch,
      isMobile: touch,
      viewport: touch ? { width: 390, height: 844 } : { width: 1280, height: 900 },
    });
    test("returns to a fresh title attempt without recording a loss or changing saved choices", async ({
      page,
    }, testInfo) => {
      await saveLevel(page, 7, 6);
      await openGame(page, false);
      await choosePlayers(page, 6);
      await selectFortress(page, 4);
      await configureGame(page, { music: false, effectsVolume: 0.4 });
      await page.clock.runFor(1000);
      const canvas = await page.locator("canvas").elementHandle(),
        progress = await page.evaluate(() =>
          JSON.parse(localStorage.getItem("citadel.progress.v1")!),
        ),
        initialAngle = await page.getByLabel("Bat angle", { exact: true }).textContent();
      if (touch) await page.getByRole("button", { name: "Start", exact: true }).tap();
      else await play(page);
      await finishIntroduction(page);
      if (touch)
        await page.evaluate(() => {
          window.__citadelTestInput.touch("pointerdown", 160, 700);
          window.__citadelTestInput.touch("pointermove", 230, 700);
        });
      else await moveMouse(page, 80, 400);
      await page.clock.runFor(200);
      if (touch) await page.evaluate(() => window.__citadelTestInput.touch("pointerup", 230, 700));
      expect(await page.getByLabel("Bat angle", { exact: true }).textContent()).not.toBe(
        initialAngle,
      );
      if (touch) await page.getByRole("button", { name: "Pause", exact: true }).tap();
      else await pause(page);
      await page.clock.runFor(300);
      await page.screenshot({
        path: testInfo.outputPath(touch ? "phone-restart.png" : "desktop-restart.png"),
      });
      const restart = page.getByRole("button", { name: "Restart", exact: true });
      if (touch) await restart.tap();
      else {
        await restart.focus();
        await page.keyboard.press("Enter");
      }
      await expect(page.getByRole("button", { name: "Start", exact: true })).toBeVisible();
      await expect(restart).toBeHidden();
      await expect(page.getByLabel("Round presentation", { exact: true })).toHaveText("title");
      await expect(page.getByLabel("Round level", { exact: true })).toHaveText("7");
      await expect(page.getByLabel("Player count", { exact: true })).toHaveText("6");
      await expect(page.getByLabel("Bat angle", { exact: true })).toHaveText(initialAngle!);
      await expect(page.locator(".diagnostics")).toContainText("0.0s");
      await expect(page.locator(".diagnostics")).toContainText("0 pieces lost");
      await expect.poll(() => page.evaluate(() => document.pointerLockElement === null)).toBe(true);
      expect(
        await page.evaluate(() => JSON.parse(localStorage.getItem("citadel.progress.v1")!)),
      ).toEqual(progress);
      expect(
        await page.evaluate(() => JSON.parse(localStorage.getItem("citadel.solo.v1")!)),
      ).toMatchObject({ count: 6, humanSeat: 4, settings: { music: false, effectsVolume: 0.4 } });
      expect(await canvas!.evaluate((node) => node.isConnected)).toBe(true);
      await page.clock.runFor(1000);
      await expect(page.locator(".diagnostics")).toContainText("0.0s");
      if (touch) await page.getByRole("button", { name: "Start", exact: true }).tap();
      else await play(page);
      await finishIntroduction(page);
      await expect(page.getByLabel("Round phase", { exact: true })).toHaveText("playing");
      await page.keyboard.press("+");
      await expect(page.getByLabel("Round level", { exact: true })).toHaveText("8");
      if (touch) await page.getByRole("button", { name: "Pause", exact: true }).tap();
      else await pause(page);
      if (touch) await restart.tap();
      else await restart.click();
      await expect(page.getByLabel("Debug mode", { exact: true })).toHaveText("Off");
      await expect(page.getByLabel("Round level", { exact: true })).toHaveText("7");
      await expect(page.getByRole("button", { name: "Start", exact: true })).toBeVisible();
      expect(
        await page.evaluate(() => JSON.parse(localStorage.getItem("citadel.progress.v1")!)),
      ).toEqual(progress);
    });
  });
}
