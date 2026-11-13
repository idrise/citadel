import { expect, test } from "./fixtures";
import { choosePlayers, finishIntroduction, openGame, openSettings, play } from "./helpers";

for (const touch of [false, true]) {
  test.describe(touch ? "touch reading window" : "mouse reading window", () => {
    test.use({
      hasTouch: touch,
      isMobile: touch,
      viewport: touch ? { width: 390, height: 844 } : { width: 1280, height: 900 },
    });
    test("holds the complete briefing, freezes on pause, and starts play only after its reading budget", async ({
      page,
    }, testInfo) => {
      await page.addInitScript(
        ({ touch }) => {
          localStorage.setItem(
            "citadel.progress.v1",
            JSON.stringify({
              version: 2,
              level: 8,
              count: 6,
              best: 7,
              rounds: touch ? 2 : 1,
              losses: touch ? 2 : 0,
              demotion: null,
              recent: Array.from({ length: touch ? 2 : 1 }, () => ({
                level: touch ? 8 : 7,
                count: 6,
                place: touch ? 2 : 1,
                at: Date.now(),
              })),
            }),
          );
        },
        { touch },
      );
      await openGame(page, false, 8);
      await choosePlayers(page, 6);
      await openSettings(page);
      await page.getByRole("checkbox", { name: "Music", exact: true }).uncheck();
      await page.getByRole("button", { name: "Resume", exact: true }).click();
      if (touch) await page.getByRole("button", { name: "Start", exact: true }).tap();
      else await play(page);
      await expect(page.getByLabel("Introduction duration", { exact: true })).toHaveText(
        touch ? "3.75" : "4.25",
      );
      await expect(page.getByLabel("Loss consequence", { exact: true })).toHaveText(
        touch ? "LOSS DROPS TO LEVEL 07" : "LOSS RETRIES LEVEL 08",
      );
      await page.clock.runFor(1800);
      await expect(page.getByLabel("Round phase", { exact: true })).toHaveText("countdown");
      await expect(page.getByLabel("Ball 0 phase", { exact: true })).toHaveText("ready");
      await expect(page.locator(".diagnostics")).toContainText("0.0s");
      if (touch) await page.getByRole("button", { name: "Pause", exact: true }).tap();
      else await page.evaluate(() => window.__citadelTestInput.key("Escape", true));
      const remaining = await page
        .getByLabel("Introduction remaining", { exact: true })
        .textContent();
      await page.clock.runFor(3000);
      await expect(page.getByLabel("Introduction remaining", { exact: true })).toHaveText(
        remaining!,
      );
      await page.getByRole("button", { name: "Resume", exact: true }).click();
      await page.clock.runFor(Math.floor(Number(remaining) * 1000) - 550);
      await expect(page.getByLabel("Round phase", { exact: true })).toHaveText("countdown");
      await expect(page.getByLabel("Ball 0 phase", { exact: true })).toHaveText("ready");
      await page.screenshot({ path: testInfo.outputPath("late-reading-hold.png") });
      await finishIntroduction(page);
      await expect(page.getByLabel("Level introduction", { exact: true })).toHaveCount(0);
      await expect(page.getByLabel("Round ball limit", { exact: true })).toHaveText("2");
    });
  });
}
