import { expect, test } from "./fixtures";
import {
  choosePlayers,
  configureGame,
  finishIntroduction,
  openGame,
  openSettings,
  pause,
  play,
} from "./helpers";
import { levelDifficulty } from "../apps/web/src/simulation/difficulty";

test("Best stays zero when starting a level, then records the level actually won", async ({
  page,
}) => {
  test.setTimeout(90000);
  await openGame(page);
  await choosePlayers(page, 2);
  await configureGame(page, { music: false, effectsVolume: 0 });
  await expect(page.getByLabel("Highest won level", { exact: true })).toHaveText("0");
  await play(page);
  await finishIntroduction(page);
  await expect(page.getByLabel("Highest won level", { exact: true })).toHaveText("0");
  for (
    let seconds = 0;
    seconds < 120 &&
    (await page.getByLabel("Round phase", { exact: true }).textContent()) !== "finished";
    seconds++
  )
    await page.clock.runFor(1000);
  await expect(page.getByLabel("Round winner", { exact: true })).toHaveText("You win");
  await expect(page.getByLabel("Highest won level", { exact: true })).toHaveText("1");
  await expect
    .poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("citadel.progress.v1")!)))
    .toMatchObject({ version: 4, level: 2, best: 1 });
  await page.clock.runFor(1200);
  await page.getByRole("button", { name: "Next level", exact: true }).click();
  await expect(page.getByLabel("Round level", { exact: true })).toHaveText("2");
  await expect(page.getByLabel("Highest won level", { exact: true })).toHaveText("1");
  await page.reload();
  await expect(page.getByLabel("Highest won level", { exact: true })).toHaveText("1");
});

for (const touch of [false, true])
  test.describe(touch ? "touch progress reset" : "desktop progress reset", () => {
    test.use({
      hasTouch: touch,
      isMobile: touch,
      viewport: touch ? { width: 390, height: 844 } : { width: 1280, height: 900 },
    });
    test("resets a paused attempt, best, history and demotion while keeping settings", async ({
      page,
    }, info) => {
      test.setTimeout(90000);
      await page.addInitScript(() => {
        if (!localStorage.getItem("citadel.progress.v1"))
          localStorage.setItem(
            "citadel.progress.v1",
            JSON.stringify({
              version: 4,
              level: 7,
              best: 12,
              count: 6,
              losses: 0,
              demotion: { from: 8, to: 7, count: 6 },
              rounds: 1,
              recent: [{ level: 8, count: 6, place: 6, at: 0 }],
            }),
          );
      });
      await page.clock.install();
      await page.goto("./?seed=2026");
      await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
      await configureGame(page, {
        music: false,
        musicVolume: 0.23,
        effectsVolume: 0.41,
        mouseSensitivity: 1.4,
        serveGuide: true,
      });
      if (touch) await page.getByRole("button", { name: "Start", exact: true }).tap();
      else await play(page);
      await finishIntroduction(page);
      if (touch) await page.getByRole("button", { name: "Pause", exact: true }).tap();
      else await pause(page);
      const settings = await page.evaluate(
        () => JSON.parse(localStorage.getItem("citadel.solo.v1")!).settings,
      );
      const canvas = await page.locator("canvas").elementHandle();
      await page.screenshot({
        path: info.outputPath(touch ? "phone-reset-settings.png" : "desktop-reset-settings.png"),
      });
      const reset = page.getByRole("button", { name: "Reset progress", exact: true });
      if (touch) await reset.tap();
      else {
        await reset.focus();
        await page.keyboard.press("Enter");
      }
      await expect(page.getByRole("button", { name: "Start", exact: true })).toBeVisible();
      await expect(page.getByLabel("Round level", { exact: true })).toHaveText("1");
      await expect(page.getByLabel("Highest won level", { exact: true })).toHaveText("0");
      await expect(page.getByLabel("Player count", { exact: true })).toHaveText(
        String(levelDifficulty(1).playerCount),
      );
      await expect
        .poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("citadel.progress.v1")!)))
        .toMatchObject({
          version: 4,
          level: 1,
          best: 0,
          rounds: 0,
          recent: [],
          losses: 0,
          demotion: null,
        });
      await page.clock.runFor(1500);
      await page.screenshot({
        path: info.outputPath(touch ? "phone-after-reset.png" : "desktop-after-reset.png"),
      });
      expect(await canvas!.evaluate((node) => node.isConnected)).toBe(true);
      expect(
        await page.evaluate(() => JSON.parse(localStorage.getItem("citadel.solo.v1")!).settings),
      ).toEqual(settings);
      await page.clock.runFor(10000);
      expect(
        await page.evaluate(() => JSON.parse(localStorage.getItem("citadel.progress.v1")!).rounds),
      ).toBe(0);
      await page.reload();
      await expect(page.getByLabel("Round level", { exact: true })).toHaveText("1");
      await expect(page.getByLabel("Highest won level", { exact: true })).toHaveText("0");
      expect(
        await page.evaluate(() => JSON.parse(localStorage.getItem("citadel.solo.v1")!).settings),
      ).toEqual(settings);
      await openSettings(page);
      const sizes = touch
        ? [
            [844, 390],
            [568, 320],
          ]
        : [
            [568, 320],
            [320, 320],
          ];
      for (const [width, height] of sizes) {
        await page.setViewportSize({ width: width!, height: height! });
        await page.clock.runFor(100);
        await expect(reset).toBeInViewport();
        await page.screenshot({ path: info.outputPath(`reset-settings-${width}-${height}.png`) });
      }
    });
  });

test("Reset progress exits debug mode and does not restore the old saved challenge", async ({
  page,
}) => {
  await openGame(page);
  await page.keyboard.press("+");
  await expect(page.getByLabel("Debug mode", { exact: true })).toHaveText(
    "Debug - progress not saved",
  );
  await pause(page);
  await page.getByRole("button", { name: "Reset progress", exact: true }).click();
  await expect(page.getByLabel("Debug mode", { exact: true })).toHaveText("Off");
  await expect(page.getByLabel("Round level", { exact: true })).toHaveText("1");
  await page.keyboard.press("Backspace");
  await expect(page.getByLabel("Round level", { exact: true })).toHaveText("1");
});
